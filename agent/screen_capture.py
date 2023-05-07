import cv2
import numpy as np
from PIL import ImageGrab

def capture_screen():
    screen = np.array(ImageGrab.grab(bbox=(0, 0, 1920, 1080)))
    screen = cv2.cvtColor(screen, cv2.COLOR_RGB2BGR)
    return screen
