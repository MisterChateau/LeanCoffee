var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io").listen(http);
var path = require("path");

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.set("port", 8080);
app.set("view engine", "jade");
app.set("views", __dirname + "/views");

io.sockets.on("connection", function(socket){
    socket.on("joinSession", function(data){
        socket.room = data;
        socket.join(data);
        console.log(socket);
    });
});

app.get("/", function(req, res){
	res.render("index");
	}
);

app.post("/topic", function(req) {
	io.sockets.emit("topicCreated", req.body);
});

http.listen(app.get("port"));



