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


app.get("/", function(req, res){
	res.render("index");
	}
);

app.post("/topic", function(req, res) {
    console.log("===>New Topic Created");
	var msg = req.body.topic;
	io.sockets.emit("newTopic", msg);
});

//start the server
http.listen(app.get("port"));



