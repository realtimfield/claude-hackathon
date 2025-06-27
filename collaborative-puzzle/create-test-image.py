#!/usr/bin/env python3
from PIL import Image

# Create a simple test image
img = Image.new('RGB', (300, 300), color='blue')
img.save('test-image.png')
print("Test image created successfully")