$(function () {

	Parse.$ = jQuery;

	// Initialize Parse API with the application ID key and the application javascript key
	Parse.initialize("Aqrki1CZlZt8zphC3WV3D692sdA9D9M79l1gkvLt",
		"puojbOL9C0d0mzPb1VZE9Lk8B5TyFFbpMpWX5IFc"
	);

	//Model
	var Topic = Parse.Object.extend({
		className: "topic",
		defaults: {
			title: "Enter your Topic",
			state: "toDiscuss"
		}
	});

	//Collection
	var TopicsCollection = Parse.Collection.extend({
		model: Topic
	});

	//Collection view
	var TopicsView = Parse.View.extend({
		tagName: "ul",
		className: "connectSortable",

		initialize: function(){
			//Append the add button to the collection view
			this.$el.html("<div id='addButton'></div>");
			$("#toDiscuss .listContainer").append(this.el);
		},

		events: {
			"click #addButton": "addTopic"
		},

		//add Topic to the board
		addTopic: function(){
			console.log(this);
			var userName = Parse.User.current().getUsername();
			this.render(userName);
		},




		//Query the Parse Rest API to retrieve each topic and render them
		loadTopics: function(userName){
			var self = this;

			var query = new Parse.Query("topic");

			query.equalTo("user",userName);

			query.find({success: function(results){
				for(var i = 0; i < results.length; i++){
					console.log(results[i].toJSON());
					//instantiate a new view passing the instance of the model
					var topicView = new TopicView({model: results[i]});
					topicView.$el.hide();
					//render the view and prepend (first Child) to the corresponding board state
					var state = topicView.model.get("state");
						;

					if(state == "toDiscuss"){
					$("#toDiscuss ul").prepend(topicView.render().el);
					}
					if(state == "discuss"){
						$("#discuss ul").prepend(topicView.render().el);
					}
					if(state == "discussed"){
						$("#discussed ul").prepend(topicView.render().el);
					}
					topicView.$el.fadeIn("slow");
				}
			}
			});
		},

		render: function(userName){
			//instantiate a new modeler
			var topic = new Topic();
			topic.set({"user": userName});
			//instantiate a new view passing the instance of the model
			var topicView = new TopicView({model: topic})
			//render the view and prepend (first Child) to the collection view root element
			topicView.$el.hide();
			$("#toDiscuss ul").prepend(topicView.render().el);
			topicView.$el.fadeIn("slow");
			//focus cursor on the first child element of the collection view
			$(".content").eq(0).attr("contentEditable","true");
			$(".content").eq(0).focus();
		}
	});

	//sub-view
	var TopicView = Parse.View.extend({

		tagName: "li",
		model: Topic,

		initialize: function(){
			console.log("==> topicView initialized")
		},

		events: {
			"keypress .content": "keyPress",
			"click .content": "editTitle",
			"focusout .content": "focusOut",
			"click .delete": "delete",
			"mousedown .draggable": "sort",
			"resize .content": "changeHeight"
		},

		//Delete a topic
		delete: function(){
			this.model.destroy();
			console.log(this.collection);
			this.$el.fadeOut("slow").remove();
		},

		//Update topic's title into the Parse Rest API
		updateModelTitle: function(value){
			this.model.set({title: value});
			this.model.save(null,
				{success: function(){
					console.log("Created");
				},

					error: function(){
						console.log("error");
					}
				});
			console.log(this.model);
		},

		//Update topic's position in the board into the Parse Rest API
		updateModelState: function(value){
			this.model.set({state: value});
			this.model.save(null,
				{success: function(){
					console.log("Created");
				},

					error: function(){
						console.log("error");
					}
				});
			console.log(this.model);
		},

		//validate the topic's title change when pressed enter
		keyPress: function(e){
			if(e.keyCode == 13){
				console.log(this.$el+" enter pressed");
				this.$(".content").blur();
				var content = this.$(".content").text();
				this.updateModelTitle(content);
			}
			if(this.$(".content").text() == "Enter your Topic"){
				this.$(".content").text("");
			}
		},

		//focus on the topic
		editTitle: function(){
			console.log($(this));
			this.$(".content").attr("contentEditable","true");
			if(this.$(".content").text() == "Enter your Topic"){
				this.$(".content").text("");
			}
			this.$el.addClass("highlight");
		},

		//update topic's title when the focus is lost
		focusOut: function(){
			this.$el.removeClass("highlight");
			var content = this.$(".content").text();
			this.updateModelTitle(content);
		},

		//make the elements sortable
		sort: function(){
			var self = this;
			$(".connectSortable" ).sortable({
				appendTo: "body",
				helper:"clone",
				zIndex: 9999,
				connectWith: ".connectSortable",

				stop: function(){
					$(this).sortable("destroy");
				},

				change:  function(){
					if($(this).parents("#discuss").length > 0){
						self.updateModelState("discuss");
					}
					if(($(this).parents("#discussed").length > 0)){
						self.updateModelState("discussed");
					}
					if(($(this).parents("#toDiscussed").length > 0)){
						self.updateModelState("toDiscuss");
					}
				}
				});
		},

		changeHeight: function(){
			console.log(this.$(".content").height)
			this.$(".draggable").height = this.$(".content").height
		},

		template: _.template($("body #topic").html()),

		render: function(){
			var template = this.template(this.model.toJSON());
			this.$el.html(template);
			return this;
		}
	});

	//Login view
	var LoginView = Parse.View.extend({
		tagName: "div",

		template: _.template($("#login").html()),

		initialize: function(){

			this.render();
		},

		events:{
		"click .register" : "register",
		"click .login" : "login"
		},

		getInputValue: function(){
			var user = new Parse.User();
			var username = $("input[name=username]").val();
			var password = $("input[name=password]").val();
			user.set({"username":username,
						"password":	password
					});
			var repeatPassword = $("input[name=repeatPassword]").val();
			return {"user": user, "password": password, "repeatPassword": repeatPassword};
		},

		login: function(){
			var userInfo = this.getInputValue();
			Parse.User.logIn(userInfo.user.getUsername(), userInfo.password,{
				success: function(user){
					console.log(user+" created");
					$(".overlayLogin").slideToggle("slow");
					var userName = Parse.User.current().getUsername();
					topicsView.loadTopics(userName);
				},
				error: function(user, error){
					console.log(user+" failed with error: "+error.message);
					$(".loginFormContainer").animate({left:"-5px"}, 100);
					$(".loginFormContainer").delay(100).animate({left:"5px"}, 100);
				}
			});

		},
		register: function(){
			/*var user = new Parse.User();
			var username = $("input[name=username]").val();
			var password = $("input[name=password]").val();
			var repeatPassword = $("input[name=repeatPassword]").val();*/
			var userInfo = this.getInputValue();
			var registerButtonText = $(".register").text();
			if(registerButtonText == "Register"){
			console.log("clicked register");
			$(".repeatPassword").slideToggle("slow");
			$(".login").slideToggle("slow");
			$(".register").text("Validate");
				}
				else{
					if(userInfo.password == userInfo.repeatPassword){
					userInfo.user.set({"password":userInfo.password, "username":userInfo.user.getUsername()});
					userInfo.user.signUp(null,{
							success: function(user){
								console.log(user+" registered");
								$(".overlayLogin").slideToggle("slow");
								topicsView.loadTopics(user);
							},
							error: function(user, error){
								console.log(error);
							}
						});
					}
			}
		},

		render: function(){
		this.$el.html(this.template);
		console.log(this);
		$("body").append(this.el);
		$(".overlayLogin").slideToggle("slow");
		return this;
	}
	});

	var loginView = new LoginView();
	var topicsCollection = new TopicsCollection();
	var topicsView = new TopicsView({collection: topicsCollection});

	//How to pop-up
	$("#howLogo").click(function(){
		console.log("clicked");
		$(".overlayHowTo").slideToggle("slow");

	});

	//LogOut
	$("#logOutLogo").click(function(){
		console.log("clicked");
		Parse.User.logOut();
		loginView.render();
	});
});