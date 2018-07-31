import boto3
from flask import Flask, render_template_string, request, Response
from pathlib import Path
from os import getenv
from hashlib import blake2b
from secrets import compare_digest

PASSWORD_HASH = getenv('CHITTER_STATUS_PWHASH')
if not PASSWORD_HASH:
    print('you forgot the password, wankus')
    exit(2)

s3 = boto3.resource('s3')
updates = s3.Object('chitter-outages', 'updates.html')

app = Flask('update')


def get_updates():
    resp = updates.get()
    return resp['Body'].read().decode()


def set_updates(content):
    content = content.encode()
    updates.put(
        Body=content, ContentLength=len(content), ContentType='text/html')


@app.route('/', methods=('GET', 'POST'))
def index():
    # TODO rate-limiting

    password = request.form.get('password', request.cookies.get(
        'password', ''))
    updates = request.form.get('updates', '')
    msg = None

    if request.method == 'GET':
        updates = get_updates()

    elif request.method == 'POST':
        pwhash = blake2b(password.encode()).hexdigest()
        if not compare_digest(pwhash, PASSWORD_HASH):
            msg = 'wrong password dingus'
            password = ''
        else:
            set_updates(updates)

    template_path = Path(__file__).parent / 'template.html'
    with open(template_path) as f:
        template = f.read()

    resp = Response(
        render_template_string(
            template, password=password, updates=updates, message=msg))
    resp.set_cookie(
        'password', password, max_age=60 * 60 * 24 * 365, httponly=True)

    return resp
