from stable_baselines3 import PPO

class RLAgent:
    def __init__(self, env):
        self.env = env
        self.model = PPO("MlpPolicy", self.env, verbose=1)

    def train(self, total_timesteps=10000):
        self.model.learn(total_timesteps=total_timesteps)

    def set_goal(self, goal):
        self.goal = goal
        # Modify environment or reward function based on the goal
        # ...

    def run(self):
        obs = self.env.reset()
        done = False
        while not done:
            action, _states = self.model.predict(obs)
            obs, reward, done, info = self.env.step(action)
            self.env.render()
