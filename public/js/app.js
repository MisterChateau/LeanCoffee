$(function () {

	Parse.$ = jQuery;

	Parse.initialize("Aqrki1CZlZt8zphC3WV3D692sdA9D9M79l1gkvLt",
		"puojbOL9C0d0mzPb1VZE9Lk8B5TyFFbpMpWX5IFc"
	);

    var topicsCollection,
        topicsView,
        socket;

	var Topic = Parse.Object.extend({
		className: "topic",
		defaults: {
			title: "Enter your Topic",
			state: "toDiscuss"
		}
	});

	var TopicsCollection = Parse.Collection.extend({
		model: Topic
	});

  var TopicsView = Parse.View.extend({
		tagName: "ul",
		className: "connectSortable",

		initialize: function(){

            var self = this;

			this.$el.html("<div id='addButton'></div>");
			$("#toDiscuss .listContainer").append(this.el);

            this.collection.on("change", this.broadcastNewTopic, this);

            var serverBaseUrl = document.domain;
            socket = io.connect(serverBaseUrl);
            socket.on("topicCreated", function(data){
                self.insertBroadcastedTopic(data);
            });

        },

		events: {
			"click #addButton": "insertTopic"
		},

		insertTopic: function(){

            console.log("clicked");
            var userName = Parse.User.current().getUsername();

            var topic = new Topic();

            topic.set({"user": userName});

            topicsCollection.add(topic);

            this.render(topic);
		},

        insertBroadcastedTopic: function(data){
            console.log(data);
        },


		loadTopics: function(userName){

			var query = new Parse.Query("topic");

			query.equalTo("user",userName);

			query.find({success: function(results){

				for(var i = 0; i < results.length; i++){

                    topicsCollection.add(results[i]);

					var topicView = new TopicView({model: results[i]});
					topicView.$el.hide();
					var state = topicView.model.get("state");

					if(state == "toDiscuss"){
					$("#"+state+" ul").prepend(topicView.render().el);
					}

					else if(state == "discuss"){
						$("#"+state+" ul").prepend(topicView.render().el);
					}
					else if(state == "discussed"){
						$("#"+state+" ul").prepend(topicView.render().el);
					}
					topicView.$el.fadeIn("slow");
				}
			}
			});
		},

          broadcastNewTopic: function(model){
              console.log("change event triggered");
              $.ajax({
                  type: "POST",
                  url: "/topic",
                  dataType: "JSON",
                  data: model.toJSON()
              })
                  .done(function (msg) {
                      console.log("Success " + msg);
                  })
                  .fail(function (msg) {
                      console.log("Fail " + msg);
                  });
          },

		render: function(topic){

			var topicView = new TopicView({model: topic});

			topicView.$el.hide();
			$("#toDiscuss ul").prepend(topicView.render().el);
			topicView.$el.fadeIn("slow");

			$(".content").eq(0).attr("contentEditable","true");
			$(".content").eq(0).focus();
		}
	});

        var TopicView = Parse.View.extend({

            tagName: "li",
            model: Topic,

            initialize: function(){
                console.log("==> topicView initialized")
            },

            events: {
                "keypress .content": "validateOnKeyPress",
                "click .content": "makeItemEditable",
                "focusout .content": "validateOnFocus",
                "click .delete": "removeTopic",
                "mousedown .draggable": "sort"
            },

            removeTopic: function(){
                this.model.destroy();
                this.$el.fadeOut("slow").remove();
            },

            updateTopicTitle: function(value){
                this.model.set({title: value});
                this.model.save();

                topicsView.broadcastNewTopic(this.model);
            },

            updateTopicState: function(value){
                this.model.set({state: value});
                topicsCollection.set(this.model);
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

            validateOnKeyPress: function(e){
                if(e.keyCode == 13){
                    console.log(this.$el+" enter pressed");
                    this.$(".content").blur();
                    var content = this.$(".content").text();
                    this.updateTopicTitle(content);

                }
                if(this.$(".content").text() == "Enter your Topic"){
                    this.$(".content").text("");
                }
            },

            makeItemEditable: function(){
                console.log($(this));
                this.$(".content").attr("contentEditable","true");
                if(this.$(".content").text() == "Enter your Topic"){
                    this.$(".content").text("");
                }
                this.$el.addClass("highlight");
            },

            validateOnFocus: function(){
                this.$el.removeClass("highlight");
                var content = this.$(".content").text();
                this.updateTopicTitle(content);
            },

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
                            self.updateTopicState("discuss");
                        }
                        else if(($(this).parents("#discussed").length > 0)){
                            self.updateTopicState("discussed");
                        }
                        else if(($(this).parents("#toDiscussed").length > 0)){
                            self.updateTopicState("toDiscuss");
                            }
                        }
                    });
            },

            template: _.template($("body #topic").html()),

            render: function(){
                var template = this.template(this.model.toJSON());
                this.$el.html(template);
                return this;
            }
        });

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

            getLoginInputValue: function(){
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
                var userInfo = this.getLoginInputValue();
                Parse.User.logIn(userInfo.user.getUsername(), userInfo.password,{
                    success: function(user){
                        console.log(user+" created");
                        $(".overlayLogin").slideToggle("slow");

                        var userName = Parse.User.current().getUsername();
                        startApp();
                        topicsView.loadTopics(userName);
                        socket.emit("joinSession", userName);

                    },
                    error: function(user, error){
                        console.log(user+" failed with error: "+error.message);
                        $(".loginFormContainer").animate({left:"-5px"}, 100);
                        $(".loginFormContainer").delay(100).animate({left:"5px"}, 100);
                    }
                });

            },
            register: function(){
                var userInfo = this.getLoginInputValue();
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
            $("body").append(this.el);
            $(".overlayLogin").slideToggle("slow");
            return this;
        }
        });

        var loginView = new LoginView();

        var startApp = function(){
            topicsCollection = new TopicsCollection();
            topicsView = new TopicsView({collection: topicsCollection});

        };

        $("#howLogo").click(function(){
            console.log("clicked");
            $(".overlayHowTo").slideToggle("slow");
        });

        $("#logOutLogo").click(function(){
            console.log("clicked");
            Parse.User.logOut();
            loginView.render();
        });
    });

