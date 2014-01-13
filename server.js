var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io").listen(http);
var path = require("path");

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.set("port", process.env.port);
app.set("view engine", "jade");
app.set("views", __dirname + "/views");

app.get("/", function (req, res) {
    res.render("index");
});

io.sockets.on("connection", function (socket) {
    socket.on("joinSession", function (data) {
        socket.room = data;
        socket.join(socket.room);
        console.log("room " + socket.room + " has a new user");
    });


    socket.on("newTopic", function (data) {
        console.log(socket.room + " " + socket);
        socket.broadcast.to(socket.room).emit("topicCreated", data);
    });

    socket.on("deleteTopic", function (data) {
        console.log(socket.room + " delete " + socket);
        socket.broadcast.to(socket.room).emit("topicDeleted", data);
    });
});

http.listen(app.get("port") || 5000);



