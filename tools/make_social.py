"""Social-preview image (og:image, 1200x630) from the explorer posters."""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

PAGE = sys.argv[1]
FONT = '/usr/share/fonts/truetype/open-sans/OpenSans-{}.ttf'
TYPES = [('Precondition', '#3f7fcf', 2709), ('State Evolution', '#3f9a52', 2323),
         ('Counterfactual', '#e0743a', 8577), ('Mistake', '#b88400', 9902),
         ('Readiness', '#9b5cc4', 7112)]

im = Image.new('RGB', (1200, 630), '#f6f9fc')
d = ImageDraw.Draw(im)
f_title = ImageFont.truetype(FONT.format('ExtraBold'), 70)
f_sub = ImageFont.truetype(FONT.format('Semibold'), 33)
f_pill = ImageFont.truetype(FONT.format('Semibold'), 22)
f_lbl = ImageFont.truetype(FONT.format('Bold'), 21)


def centered(y, text, font, fill):
    w = d.textlength(text, font=font)
    d.text(((1200 - w) / 2, y), text, font=font, fill=fill)


centered(46, 'ProcObject-10K', f_title, '#1e66d0')
centered(150, 'Benchmarking Object-Centric Procedural Understanding', f_sub, '#18253a')
centered(194, 'in Instructional Videos', f_sub, '#18253a')
pill = 'NeurIPS 2026  ·  Evaluations & Datasets Track'
pw = d.textlength(pill, font=f_pill) + 44
d.rounded_rectangle(((1200 - pw) / 2, 258, (1200 + pw) / 2, 298), radius=20, fill='#e6effb', outline='#c9dbf3')
centered(264, pill, f_pill, '#24344b')

W, H, gap = 212, 119, 16
x0 = (1200 - (5 * W + 4 * gap)) / 2
for k, (name, color, qid) in enumerate(TYPES):
    x = int(x0 + k * (W + gap))
    y = 342
    poster = Image.open(os.path.join(PAGE, f'static/videos/explorer/{qid}.jpg')).convert('RGB').resize((W, H))
    d.rounded_rectangle((x - 1, y - 1, x + W + 1, y + H + 62), radius=14, fill='#ffffff', outline='#e1e7f0')
    im.paste(poster, (x, y + 8))
    d.rectangle((x, y, x + W, y + 7), fill=color)
    tw = d.textlength(name, font=f_lbl)
    d.text((x + (W - tw) / 2, y + H + 18), name, font=f_lbl, fill='#18253a')
centered(560, '10,522 grounded VideoQA pairs  ·  1,799 videos  ·  137 tasks  ·  answer + evidence spans',
         ImageFont.truetype(FONT.format('Regular'), 22), '#4e5d73')
im.save(os.path.join(PAGE, 'static/images/social.jpg'), quality=88)
