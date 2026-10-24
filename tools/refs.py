"""Puts the circled source letters (A, B, C...) in reading order.

relabel(html) renames every letter by its first appearance in the page and sorts
the source popovers to match, so a reader meets A first, then B, and so on.
Used by make_health.py on every build. To fix the letters in index.html by hand:
    python tools/refs.py index.html
"""
import re, sys

BTN = re.compile(r'<button type="button" class="ref" popovertarget="src-([A-Z])" aria-label="([^"]*?) [A-Z]">[A-Z]</button>')
BLOCK = re.compile(r'  <div class="src" id="src-([A-Z])" popover.*?\n  </div>\n?', re.S)


def relabel(html):
    order = []
    for m in BTN.finditer(html):
        if m.group(1) not in order:
            order.append(m.group(1))
    blocks = {m.group(1): m.group(0) for m in BLOCK.finditer(html)}
    order += [k for k in sorted(blocks) if k not in order]   # a source nobody cites goes last
    new = {old: chr(65 + i) for i, old in enumerate(order)}

    html = BTN.sub(lambda m: '<button type="button" class="ref" popovertarget="src-%s" aria-label="%s %s">%s</button>'
                   % (new[m.group(1)], m.group(2), new[m.group(1)], new[m.group(1)]), html)

    def reblock(old):
        n, b = new[old], blocks[old]
        for a in ('id="src-%s"', 'aria-labelledby="src-%s-k"', 'id="src-%s-k"', 'popovertarget="src-%s"'):
            b = b.replace(a % old, a % n)
        b = re.sub(r'(<p class="src-k" id="src-%s-k">[^<]*) [A-Z]</p>' % n, r'\g<1> %s</p>' % n, b)
        return b.rstrip("\n") + "\n"

    if blocks:
        first = BLOCK.search(html).start()
        rest = BLOCK.sub("", html)
        html = rest[:first] + "".join(reblock(o) for o in order) + rest[first:]
    return html


if __name__ == "__main__":
    for path in sys.argv[1:]:
        s = open(path, encoding="utf-8").read().replace("\r\n", "\n")
        open(path, "w", encoding="utf-8", newline="\n").write(relabel(s))
        print(path, "letters in reading order")
