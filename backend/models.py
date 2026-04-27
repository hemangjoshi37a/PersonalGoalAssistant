"""
models.py
Database models for the Personal Goal Assistant.
Defines schema for Missions, Subtasks, Habits, and Habit Logs using SQLAlchemy.
"""

import math
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from typing import Dict, Any, List

db = SQLAlchemy()

class Mission(db.Model):
    """
    Represents a high-level personal goal/mission.
    """
    __tablename__ = 'missions'
    id = db.Column(db.Integer, primary_key=True)
    goal = db.Column(db.String(500), nullable=False)
    intensity = db.Column(db.String(50), default='balanced')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_completed = db.Column(db.Boolean, default=False)
    
    # Relationship to subtasks
    subtasks = db.relationship('Subtask', backref='mission', lazy=True, cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the Mission object to a dictionary.
        """
        return {
            'id': self.id,
            'goal': self.goal,
            'intensity': self.intensity,
            'timestamp': self.timestamp.isoformat(),
            'is_completed': self.is_completed,
            'subtasks': [s.to_dict() for s in sorted(self.subtasks, key=lambda s: s.order)]
        }

class Subtask(db.Model):
    """
    Represents an actionable subtask derived from a Mission.
    """
    __tablename__ = 'subtasks'
    id = db.Column(db.Integer, primary_key=True)
    mission_id = db.Column(db.Integer, db.ForeignKey('missions.id'), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the Subtask object to a dictionary.
        """
        return {
            'id': self.id,
            'text': self.text,
            'is_completed': self.is_completed,
            'order': self.order
        }

class Habit(db.Model):
    """
    Represents a recurring habit being tracked.
    """
    __tablename__ = 'habits'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    cue = db.Column(db.String(200))          # The behavioral trigger
    reward = db.Column(db.String(200))        # The craving satisfaction
    frequency = db.Column(db.String(50), default='daily')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    logs = db.relationship('HabitLog', backref='habit', lazy=True, cascade="all, delete-orphan")

    @property
    def streak(self) -> int:
        """Calculates the current consecutive-day streak."""
        completed_dates = sorted(
            set(l.timestamp.date() for l in self.logs if l.status == 'completed'),
            reverse=True
        )
        if not completed_dates:
            return 0

        today = datetime.utcnow().date()
        streak = 0
        expected = today

        for d in completed_dates:
            if d == expected:
                streak += 1
                expected -= timedelta(days=1)
            elif d == today - timedelta(days=1) and streak == 0:
                streak += 1
                expected = d - timedelta(days=1)
            else:
                break

        return streak

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the Habit object to a dictionary.
        """
        completed_logs = [l for l in self.logs if l.status == 'completed']
        return {
            'id': self.id,
            'name': self.name,
            'cue': self.cue,
            'reward': self.reward,
            'frequency': self.frequency,
            'created_at': self.created_at.isoformat(),
            'streak': self.streak,
            'totalLogs': len(completed_logs),
            'logs': [l.to_dict() for l in self.logs]
        }

class HabitLog(db.Model):
    """
    Represents an execution record for a Habit.
    """
    __tablename__ = 'habit_logs'
    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(db.Integer, db.ForeignKey('habits.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='completed')  # 'completed' | 'missed'

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the HabitLog object to a dictionary.
        """
        return {
            'id': self.id,
            'habit_id': self.habit_id,
            'habit_name': self.habit.name if self.habit else None,
            'timestamp': self.timestamp.isoformat(),
            'status': self.status
        }

class UserStats(db.Model):
    """
    Tracks the user's gamified progress: XP, Level, and Rank.
    """
    __tablename__ = 'user_stats'
    id = db.Column(db.Integer, primary_key=True)
    xp = db.Column(db.Integer, default=0)
    
    @property
    def level(self) -> int:
        """Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP... (Level = floor(sqrt(xp/100)) + 1)"""
        return math.floor(math.sqrt(self.xp / 100)) + 1 if self.xp > 0 else 1

    @property
    def rank(self) -> str:
        lvl = self.level
        if lvl < 5:  return "Novice Explorer"
        if lvl < 15: return "Strategic Architect"
        if lvl < 30: return "Mission Commander"
        if lvl < 50: return "Silicon Overlord"
        return "Transcendental Being"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'xp': self.xp,
            'level': self.level,
            'rank': self.rank,
            'nextLevelXp': (self.level ** 2) * 100
        }
