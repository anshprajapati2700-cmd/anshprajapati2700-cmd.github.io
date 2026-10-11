import json, re, sys
trims = json.load(open(sys.argv[1]))
src = open('sound.html').read()
body = ', '.join(f'{k}: {v:.3f}' for k, v in trims.items())
src = re.sub(r'/\*TRIM\*/ const TRIM = \{.*?\};  /\*END\*/', '/*TRIM*/ const TRIM = {' + body + '};  /*END*/', src, flags=re.S)
open('sound.html', 'w').write(src)
print('baked', len(trims), 'trims')
