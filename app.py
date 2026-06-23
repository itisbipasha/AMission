from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
from datetime import datetime,timezone
from functools import wraps

app = Flask(__name__)
app.secret_key = 'AMission-secret-key-2024'

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),'todo.db')

# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT    UNIQUE NOT NULL,
                password TEXT    NOT NULL,
                created  TEXT    DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                title       TEXT    NOT NULL,
                description TEXT,
                deadline    TEXT,
                priority    TEXT    DEFAULT 'medium',
                done        INTEGER DEFAULT 0,
                created     TEXT    DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        ''')

init_db()

# ─── Auth helpers ─────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        if len(username) < 3:
            error = 'Username must be at least 3 characters.'
        elif len(password) < 6:
            error = 'Password must be at least 6 characters.'
        else:
            try:
                with get_db() as conn:
                    conn.execute(
                        'INSERT INTO users (username, password) VALUES (?, ?)',
                        (username, generate_password_hash(password))
                    )
                return redirect(url_for('login', new=1))
            except sqlite3.IntegrityError:
                error = 'That username is already taken. Try another one!'
    return render_template('signup.html', error=error)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    new = request.args.get('new')
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        with get_db() as conn:
            user = conn.execute(
                'SELECT * FROM users WHERE username = ?', (username,)
            ).fetchone()
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('dashboard'))
        else:
            error = 'Incorrect username or password. Give it another try!'
    return render_template('login.html', error=error, new=new)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    filter_by = request.args.get('filter', 'all')
    with get_db() as conn:
        if filter_by == 'done':
            tasks = conn.execute(
                'SELECT * FROM tasks WHERE user_id=? AND done=1 ORDER BY deadline ASC',
                (session['user_id'],)
            ).fetchall()
        elif filter_by == 'pending':
            tasks = conn.execute(
                'SELECT * FROM tasks WHERE user_id=? AND done=0 ORDER BY deadline ASC',
                (session['user_id'],)
            ).fetchall()
        else:
            tasks = conn.execute(
                'SELECT * FROM tasks WHERE user_id=? ORDER BY done ASC, deadline ASC',
                (session['user_id'],)
            ).fetchall()
        counts = conn.execute(
            'SELECT COUNT(*) as total, SUM(done) as done FROM tasks WHERE user_id=?',
            (session['user_id'],)
        ).fetchone()
    return render_template('dashboard.html',
                           tasks=tasks,
                           filter_by=filter_by,
                           counts=counts,
                           username=session['username'])

@app.route('/task/add', methods=['POST'])
@login_required
def add_task():
    title       = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    deadline    = request.form.get('deadline', '').strip()
    priority    = request.form.get('priority', 'medium')
    if title:
        with get_db() as conn:
            conn.execute(
                'INSERT INTO tasks (user_id, title, description, deadline, priority) VALUES (?,?,?,?,?)',
                (session['user_id'], title, description, deadline or None, priority)
            )
    return redirect(url_for('dashboard'))

@app.route('/task/done/<int:task_id>')
@login_required
def mark_done(task_id):
    with get_db() as conn:
        conn.execute(
            'UPDATE tasks SET done=1 WHERE id=? AND user_id=?',
            (task_id, session['user_id'])
        )
    return redirect(url_for('dashboard'))

@app.route('/task/undo/<int:task_id>')
@login_required
def undo_done(task_id):
    with get_db() as conn:
        conn.execute(
            'UPDATE tasks SET done=0 WHERE id=? AND user_id=?',
            (task_id, session['user_id'])
        )
    return redirect(url_for('dashboard'))

@app.route('/task/delete/<int:task_id>')
@login_required
def delete_task(task_id):
    with get_db() as conn:
        conn.execute(
            'DELETE FROM tasks WHERE id=? AND user_id=?',
            (task_id, session['user_id'])
        )
    return redirect(url_for('dashboard'))

@app.route('/task/edit/<int:task_id>', methods=['GET', 'POST'])
@login_required
def edit_task(task_id):
    with get_db() as conn:
        task = conn.execute(
            'SELECT * FROM tasks WHERE id=? AND user_id=?',
            (task_id, session['user_id'])
        ).fetchone()
    if not task:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        title       = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        deadline    = request.form.get('deadline', '').strip()
        priority    = request.form.get('priority', 'medium')
        with get_db() as conn:
            conn.execute(
                'UPDATE tasks SET title=?, description=?, deadline=?, priority=? WHERE id=? AND user_id=?',
                (title, description, deadline or None, priority, task_id, session['user_id'])
            )
        return redirect(url_for('dashboard'))
    return render_template('edit_task.html', task=task, username=session['username'])

# ─── API: tasks due within 1 hour (for browser notifications) ────────────────

@app.route('/api/due-soon')
@login_required
def due_soon():
    now = datetime.now()
    with get_db() as conn:
        tasks = conn.execute(
            "SELECT id, title, deadline FROM tasks WHERE user_id=? AND done=0 AND deadline IS NOT NULL",
            (session['user_id'],)
        ).fetchall()
    due = []
    for t in tasks:
        try:
            dl = datetime.strptime(t['deadline'], '%Y-%m-%dT%H:%M')
            diff = (dl - now).total_seconds()
            if 0 < diff <= 3600:
                due.append({'id': t['id'], 'title': t['title'], 'deadline': t['deadline'], 'minutes_left': int(diff // 60)})
        except Exception:
            pass
    return jsonify(due)

if __name__ == '__main__':
    port= int(os.environ.get('PORT',5000))
    app.run(host='0.0.0.0',port=port,debug=False)
