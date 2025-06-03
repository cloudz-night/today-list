const supabase = window.supabase.createClient('https://wfdvhbrasceleiegcera.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZHZoYnJhc2NlbGVpZWdjZXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjYxMjUsImV4cCI6MjA2NDM0MjEyNX0.1789MUbzKMKLQsG4Qj6H0_Mg75InIxcSYVtxvKukVmE');

function menuToggle() {
    var menu = document.getElementById("menu");
    menu.classList.toggle("menu--visible");
}

async function new_task() {
    const taskInput = document.getElementById('task_input');
    const taskDate = document.getElementById('task_date');
    const taskList = document.getElementById('task_list');

    const taskName = taskInput.value.trim();
    const taskTime = taskDate.value.trim();

    if (taskName === '') {
        alert("enter a task name.");
        return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("You must be logged in to add tasks.");
        return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error } = await supabase
        .from('tasks')
        .insert([
            { user_id: user.id, name: taskName, time: taskTime, task_date: today }
        ]);

    if (error) {
        alert("Error saving task: " + error.message);
        return;
    }

    // Clear inputs and reload tasks
    taskInput.value = '';
    taskDate.value = '';
    load_tasks();
}

// Loads all tasks for the logged-in user
async function load_tasks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_date', today)
        .order('id', { ascending: false });

    const taskList = document.getElementById('task_list');
    taskList.innerHTML = '';

    if (data) {
        data.forEach(task => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.innerHTML = `
    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompleted('${task.id}', this.checked)">
    <span contenteditable="false" id="task-name-${task.id}" style="flex:1; text-decoration:${task.completed ? 'line-through' : 'none'}; margin-left:8px;">${task.name}${task.time ? ' - ' + task.time : ''}</span>
    <div style="display:flex; gap:4px; margin-left:auto;">
        <button class="edit-btn" onclick="editTask('${task.id}')">edit</button>
        <button class="delete-btn" onclick="deleteTask('${task.id}')">delete</button>
        <button class="save-btn" onclick="saveTask('${task.id}')" style="display:none;">save</button>
    </div>
`;
            taskList.appendChild(li);
        });
    }
}

async function signUp() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;
    let { data, error } = await supabase.auth.signUp({ email, password });
    document.getElementById("status").textContent = error ? error.message : "Check your email for confirmation!";

    // If sign up successful, insert username into profiles table
    if (data.user && username) {
        const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, username }
        ]);
        if (profileError) {
            console.error("Profile insert error:", profileError.message);
        }
    }
}

async function signIn() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById("status").textContent = error.message;
        return;
    }
    document.getElementById("status").textContent = "Logged in!";
    updateAuthUI(true);
    window.location.href = "index.html";
}

async function logOut() {
    await supabase.auth.signOut();
    document.getElementById("status").textContent = "Logged out!";
    document.getElementById("username-text").textContent = "";
    document.getElementById("username-display").style.display = "none";
    document.getElementById("logout-btn").style.display = "none";
    document.getElementById("task_list").innerHTML = "";
    updateAuthUI(false);
}

function updateAuthUI(isLoggedIn) {
    document.getElementById("email").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("password").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("username").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("signup-btn").style.display = isLoggedIn ? "none" : "inline-block";
    document.getElementById("login-btn").style.display = isLoggedIn ? "none" : "inline-block";
    document.getElementById("login-label").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("logout-btn").style.display = isLoggedIn ? "inline-block" : "none";
    const loginRegister = document.getElementById("login-register");
    if (loginRegister) {
        loginRegister.style.display = isLoggedIn ? "none" : "block";
    }
}

async function toggleTaskCompleted(id, completed) {
    const { error } = await supabase.from('tasks').update({ completed }).eq('id', id);
    if (error) console.error("Toggle error:", error.message);
    load_tasks();
}

function editTask(id) {
    const span = document.getElementById(`task-name-${id}`);
    span.contentEditable = "true";
    span.focus();
    const btnContainer = span.nextElementSibling;
    btnContainer.querySelector('.edit-btn').style.display = "none";
    btnContainer.querySelector('.delete-btn').style.display = "none";
    btnContainer.querySelector('.save-btn').style.display = "inline-block";
}

async function saveTask(id) {
    const span = document.getElementById(`task-name-${id}`);
    const [name, time] = span.textContent.split(' - ');
    const { error } = await supabase.from('tasks').update({ name: name.trim(), time: time ? time.trim() : null }).eq('id', id);
    if (error) console.error("Save error:", error.message);
    span.contentEditable = "false";
    const btnContainer = span.nextElementSibling;
    btnContainer.querySelector('.edit-btn').style.display = "inline-block";
    btnContainer.querySelector('.delete-btn').style.display = "inline-block";
    btnContainer.querySelector('.save-btn').style.display = "none";
    load_tasks();
}

async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error("Delete error:", error.message);
    load_tasks();
}

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Fetch username and show it
        let { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (profile && profile.username) {
            document.getElementById("username-text").textContent = profile.username;
            document.getElementById("username-display").style.display = "block";
        } else {
            document.getElementById("username-text").textContent = "";
            document.getElementById("username-display").style.display = "none";
        }
        load_tasks();
        updateAuthUI(true);
    } else {
        document.getElementById("username-display").textContent = "";
        document.getElementById("username-display").style.display = "none";
        updateAuthUI(false);
    }
});

document.addEventListener('keydown', function(e) {
    if (document.activeElement && document.activeElement.contentEditable === "true" && e.key === "Enter") {
        e.preventDefault();
    }
});

window.editTask = editTask;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.toggleTaskCompleted = toggleTaskCompleted;
