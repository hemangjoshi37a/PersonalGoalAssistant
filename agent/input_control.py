import pyautogui

def move_mouse_to(x, y):
    pyautogui.moveTo(x, y)

def press_key(key):
    pyautogui.press(key)

def click(button='left', clicks=1):
    pyautogui.click(button=button, clicks=clicks)

# Add more functions as needed for input control
