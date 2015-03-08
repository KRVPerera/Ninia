for i in [2, 3]:
    print i

for i in [6, 5, 4]:
    for j in [1, 2]:
        print i, j

for i in xrange(4):
    print i

for i in range(3):
    print i

for i in range(0, 10, 2):
    print i

for i in range(0, -10, -2):
    print i

for i in range(10):
    i = i+1
    print i

for i in range(10):
    if i%2 == 0:
        continue

for i in range(10):
    if i == 5:
        break
