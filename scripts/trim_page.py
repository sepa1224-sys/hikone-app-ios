# -*- coding: utf-8 -*-
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
page_path = os.path.join(script_dir, '..', 'app', 'page.tsx')

with open(page_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 1-649 (0-indexed: 0-648), add closing brace
new_content = ''.join(lines[:649]) + '}\n'

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done')
