import re, sys
src = open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','gundam-card-game.html')).read()
m = re.search(r'<script[^>]*>(.*?)</script>', src, re.S)
open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'game.js'),'w').write(m.group(1))
print('game.js', len(m.group(1)))
