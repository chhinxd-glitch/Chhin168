/**
 * Web Terminal - Backend (Node.js)
 * -----------------------------------
 * ប្រើ Express + Socket.IO + node-pty ដើម្បីបើក shell ពិតៗ
 * ហើយភ្ជាប់វាទៅ browser តាមរយៈ WebSocket (real-time)
 *
 * របៀបដំឡើង (Install):
 *     npm install
 *
 * របៀបដំណើរការ (Run):
 *     npm start
 *
 * បើក browser ទៅ: http://localhost:5000
 */

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const pty = require("node-pty");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// បម្រើ static files (HTML, CSS, JS) ពី folder "public"
app.use(express.static(path.join(__dirname, "public")));

// ជ្រើសរើស shell អាស្រ័យលើ OS (Windows ប្រើ powershell.exe, Linux/Mac ប្រើ bash)
const shell = process.platform === "win32" ? "powershell.exe" : "bash";

io.on("connection", (socket) => {
    console.log("Client connected -> spawning new shell:", shell);

    // បើក pseudo-terminal ថ្មីមួយសម្រាប់ client នេះ
    const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.env.USERPROFILE,
        env: process.env,
    });

    // ១. នៅពេល shell បញ្ចេញ output -> ផ្ញើទៅ browser
    ptyProcess.onData((data) => {
        socket.emit("terminal_output", { output: data });
    });

    // ២. នៅពេល browser ផ្ញើអក្សរដែលវាយចូល -> សរសេរទៅ shell
    socket.on("terminal_input", (data) => {
        ptyProcess.write(data.input);
    });

    // ៣. នៅពេលបង្អួច browser ប្តូរទំហំ -> ប្តូរទំហំ terminal ដែរ
    socket.on("resize", (data) => {
        try {
            ptyProcess.resize(data.cols, data.rows);
        } catch (err) {
            console.error("Resize error:", err.message);
        }
    });

    // ៤. នៅពេល client disconnect -> បិទ shell process ដើម្បីកុំឱ្យលេចធ្លាយ (memory leak)
    socket.on("disconnect", () => {
        console.log("Client disconnected -> killing shell");
        ptyProcess.kill();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Web Terminal running at http://localhost:${PORT}`);
});
