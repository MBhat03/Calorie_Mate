from flask import Flask
app = Flask(__name__)

@app.route('/')
def home():
    return '<script src="/static/dashboard.js"></script><p>If you see no JS errors, static is working.</p>'

if __name__ == '__main__':
    app.run(debug=True) 