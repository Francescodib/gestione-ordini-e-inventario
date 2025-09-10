import express from "express";
import {Server} from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
    res.send("Hello World");
});

io.on("connection", (socket) => {
    console.log("a user connected");
});

server.listen(3000, () => {
    console.log("server is running on port 3000");
});