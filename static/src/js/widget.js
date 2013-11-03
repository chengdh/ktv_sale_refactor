//widget定义
//erp_instance openerp的客户端实例对象，在boot.js中初始化
openerp.ktv_sale.widget = function(erp_instance) {
	//引用model和helper
	var model = erp_instance.ktv_sale.model;
	var helper = erp_instance.ktv_sale.helper;
	//扩展通用的模板方法
	var QWeb = erp_instance.web.qweb;
	var qweb_template = function(template) {
		return function(ctx) {
			return QWeb.render(template, _.extend({},
			ctx, {
				//以下定义需要在界面上显示的数据
				'company': erp_instance.ktv_sale.ktv_room_point.get('company').toJSON(),
        'uid' : erp_instance.session.uid,
        'username' : erp_instance.session.username,
        'db' : erp_instance.session.db,
				'users': erp_instance.ktv_sale.ktv_room_point.get('users').toJSON(),
				'display_rooms': erp_instance.ktv_sale.ktv_room_point.get('display_rooms').toJSON(),
				'room_types': erp_instance.ktv_sale.ktv_room_point.get('room_types').toJSON(),
				'room_areas': erp_instance.ktv_sale.ktv_room_point.get('room_areas').toJSON(),
				'fee_types': erp_instance.ktv_sale.ktv_room_point.get('fee_types').toJSON(),
				'price_classes': erp_instance.ktv_sale.ktv_room_point.get('price_classes').toJSON(),
				'member_classes': erp_instance.ktv_sale.ktv_room_point.get('member_classes').toJSON(),
				'pay_types': erp_instance.ktv_sale.ktv_room_point.get('pay_types').toJSON(),
				'currency': erp_instance.ktv_sale.ktv_room_point.get('currency'),
				'format_amount': function(amount) {
					if (erp_instance.ktv_sale.ktv_room_point.get('currency').position == 'after') {
						return amount + ' ' + erp_instance.ktv_sale.ktv_room_point.get('currency').symbol;
					} else {
						return erp_instance.ktv_sale.ktv_room_point.get('currency').symbol + ' ' + amount;
					}
				},
			}));
		};
	};
	var _t = erp_instance.web._t;

	var widget = erp_instance.ktv_sale.widget = {};
	//定义基于bootstrap的modal的dialog类
	widget.BootstrapModal = erp_instance.web.Widget.extend({
		/**
                 * @constructs openerp.web.Dialog
                 * @extends openerp.web.Widget
                 *
                 * @param parent
                 * @param options
                 */
		init: function(parent, options) {
			var self = this;
			this._super(parent);
			this.dialog_options = {
				width: 'auto',
				backdrop: 'static',
				keyboard: true,
				show: true,
				remote: false
			};
			if (options) {
				_.extend(this.dialog_options, options);
			}
			if (this.dialog_options.show) this.open();

		},
		open: function(options) {
			var self = this;
			this.appendTo($('body'));
			this.$(".modal").modal(self.dialog_options).on('hidden', _.bind(self.destroy, self)).modal('show').css({
				width: self.dialog_options.width,
				'margin-left': function() {
					return - ($(this).width() / 2);
				}
			}).on("shown", _.bind(this.post_open, this));
			return this;
		},
		//打开后的处理,用于焦点设置等等
		post_open: function() {},
		close: function() {
			this.$(".modal").modal('hide');
		},
		destroy: function() {
			// Destroy widget
			this.close();
			this._super();
		}
	});
	//提示对话框
	widget.AlertWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("alert-template"),
		init: function(parent, options) {
			this._super(parent, options);
			this.alert_class = options.alert_class;
			this.info = options.info;
			this.title = options.title;
			this.timer = $.timer(_.bind(this._auto_close, this), 10000, false);
		},
		renderElement: function() {
			this.$el.html(this.template_fct({
				title: this.title,
				info: this.info
			}));
			return this;
		},
		start: function() {
			this.$(".alert").addClass(this.alert_class);
			this.$el.on('click', ".close", _.bind(this._auto_close, this));
			this.timer.play();
		},
		//自动关闭
		_auto_close: function() {
			console.log("auto close alert widget");
			this.timer.stop();
			this.timer = null;
			this.destroy();
		}
	});

	//roomWidget
	widget.RoomWidget = erp_instance.web.Widget.extend({
		tagName: 'li',
		template_fct: qweb_template('room-template'),
		init: function(parent, options) {
			this._super(parent);
			this.model = options.model;
		},
		renderElement: function() {
            console.debug(this.model.get('name') + "RoomWidget RenderElement");
			this.$el.empty();
			this.$el.html(this.template_fct({
				room: this.model.export_as_json()
			}));
			//添加或修改包厢状态css
			this.$el.removeClass();
			this.$el.addClass(this.model.get('state'));
		},
		start: function() {
			this.model.on('change', this.renderElement,this);
			this.model.on('change', this._set_room_action_list, this);
			this.$el.on('click', _.bind(this.on_click, this));
			this._set_room_action_list();
		},
		//包厢预定
		action_room_scheduled: function() {
			var win = new widget.RoomScheduledWidget(null, {
				room: this.model,
			});
			win.ready.then(function() {
				$('#operate_area').html(win.$el);
				win.renderElement();
				win.start();
			});
		},

		action_room_scheduled_cancel: function() {},
		//开房
		action_room_opens: function() {
			console.log("打开开房界面");
			var r = new widget.RoomOpensWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
		},
		//买断
		action_room_buyout: function() {
			var r = new widget.RoomCheckoutBuyoutWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
		},
		//买钟
		action_room_buytime: function() {
			var r = new widget.RoomCheckoutBuytimeWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
		},
		//续钟
		action_room_buytime_continue: function() {
			var r = new widget.RoomCheckoutBuytimeContinueWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
		},
		//退钟
		action_room_buytime_refund: function() {
			var r = new widget.RoomCheckoutBuytimeRefundWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
		},
		//包厢换房-买断
		action_room_change: function() {
			console.log("enter into action_room_change");
			var win;
			//判断是何种换房
			//正常换房 RoomChangeWidget
			//买钟换房 RoomChangeCheckoutBuytimeWidget
			//买断换房 RoomChangeCheckoutBuyoutWidget
			if (this.model.get('state') == 'in_use') win = new widget.RoomChangeWidget(null, {
				room: this.model,
			});
			if (this.model.get('state') == 'buyout') var win = new widget.RoomChangeCheckoutBuyoutWidget(null, {
				room: this.model,
			});

			if (this.model.get('state') == 'buytime') var win = new widget.RoomChangeCheckoutBuytimeWidget(null, {
				room: this.model,
			});

			win.ready_init.then(function() {
				$('#operate_area').html(win.$el);
				win.renderElement();
				win.start();
			});
		},
		//TODO 正常开房结账
		action_room_checkout: function() {
			var r = new widget.RoomCheckoutWidget(null, {
				room: this.model
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});

		},
		//TODO 结账重开
		action_room_reopen: function() {},
		//TODO 并房操作
		action_room_merge: function() {},
		//当前包厢点击事件
		on_click: function(evt) {
			erp_instance.ktv_sale.ktv_room_point.set({
				"current_room": this.model
			});
		},
		//设置当前包厢可用的action
		_set_room_action_list: function() {
			var actions_list = erp_instance.ktv_sale.helper.get_room_actions_list(this.model.get('state'));
			var actions_array = erp_instance.ktv_sale.helper.get_room_actions_array(this.model.get('state'));
			var all_actions_array = erp_instance.ktv_sale.helper.all_room_actions_array();
			this.$el.find('.room-action-menu li').addClass('disabled');
			this.$el.find(actions_list).removeClass('disabled');
			//先将所有已绑定的事件解除
			_.each(all_actions_array, function(action) {
				this.$el.off('click', action);
			},
			this);
			//只绑定需要的操作
			_.each(actions_array, function(action) {
				this.$el.on('click', action, _.bind(this[action.substr(1)], this));
			},
			this);
		}

	});
	//房间列表
	widget.RoomListWidget = erp_instance.web.Widget.extend({
		init: function(parent, options) {
			this._super(parent);
			erp_instance.ktv_sale.ktv_room_point.get('display_rooms').on('reset', this.renderElement, this);
		},
		renderElement: function() {
			var self = this;
			this.$el.empty();
			erp_instance.ktv_sale.ktv_room_point.get('display_rooms').each(_.bind(function(r) {
				var r_widget = new widget.RoomWidget(null, {
					model: r
				});
				r_widget.appendTo(self.$el);
			},
			this), this);
			return this;
		}
	});
	//房态统计
	//RoomStatusWidget
	widget.RoomStatusWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template('room-status-template'),
		init: function(parent, options) {
			this._super(parent);
		},
		start: function() {
			//ktv_shop中的包厢数据发生变化时,重绘房态组件
			erp_instance.ktv_sale.ktv_room_point.bind('change:room_status', this.renderElement, this);
		},
		renderElement: function() {
			this.$el.empty();
			this.$el.html(this.template_fct(erp_instance.ktv_sale.ktv_room_point.get('room_status')));
			return this;
		}
	});

	//包厢过滤 widget
	widget.RoomFilterWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template('room-filter'),
		init: function(parent, options) {
			this._super(parent);
		},
		start: function() {
			//ktv_shop中的包厢数据发生变化时,重绘房态组件
			erp_instance.ktv_sale.ktv_room_point.on('change:room_status', this._refresh_room_status, this);
			//绑定按钮点击事件
			$('.btn-room-type-filter,.btn-room-area-filter,.btn-room-state-filter').click(_.bind(this._filter_room, this));
			this._refresh_room_status();
		},
		//修改房态汇总信息
		_refresh_room_status: function() {
			var room_status = erp_instance.ktv_sale.ktv_room_point.get('room_status');
			for (attr in room_status) {
				var css_class = ".room-count-" + attr;
				this.$(css_class).html(room_status[attr]);
			}
		},
		//根据前端的操作过滤包厢的显示
		_filter_room: function(evt) {
			var click_btn = $(evt.target);
			var btn_class = "";
			if (click_btn.hasClass('btn-room-type-filter')) btn_class = ".btn-room-type-filter";
			if (click_btn.hasClass('btn-room-state-filter')) btn_class = ".btn-room-state-filter";
			if (click_btn.hasClass('btn-room-area-filter')) btn_class = ".btn-room-area-filter";

			$(btn_class).removeClass('active')
			if (!click_btn.hasClass('active')) click_btn.addClass('active');
			var room_state = $('.btn-room-state-filter').filter('.active').data('room-state');
			var room_area_id = $('.btn-room-area-filter').filter('.active').data('room-area-id');
			var room_type_id = $('.btn-room-type-filter').filter('.active').data('room-type-id');
			//所有房间
			var search_critial = []
			if (room_state != - 1) search_critial.push(['state', '=', room_state]);
			if (room_type_id != - 1) search_critial.push(['room_type_id', '=', room_type_id]);
			if (room_area_id != - 1) search_critial.push(['room_area_id', '=', room_area_id]);
			erp_instance.ktv_sale.ktv_room_point.reset_display_rooms(search_critial);
		},

		renderElement: function() {
			this.$el.html(this.template_fct({}));
			return this;
		}
	});

	//KtvRoomPointWidget
	widget.KtvRoomPointWidget = erp_instance.web.Widget.extend({
		init: function(parent, options) {
			this._super(parent);
		},
		start: function() {
			this.room_list_view = new widget.RoomListWidget();
			this.room_list_view.$el = $('#room_list');
			this.room_list_view.renderElement();
			this.room_list_view.start();

			//不显示room_status
			/*
			this.room_status_view = new erp_instance.ktv_sale.widget.RoomStatusWidget();
			this.room_status_view.$el = $('#room_status');
			this.room_status_view.renderElement();
			this.room_status_view.start();
            */

			//room filter
			this.room_filter_view = new erp_instance.ktv_sale.widget.RoomFilterWidget();
			this.room_filter_view.$el = $('#room_filter');
			this.room_filter_view.renderElement();
			this.room_filter_view.start();

			//room info
			this.room_info_tab_view = new widget.RoomInfoWidget();
			this.room_info_tab_view.$el = $('#room_info_tab');
			this.room_info_tab_view.renderElement();
			this.room_info_tab_view.start();
		}
	});

	//右侧显示的包厢信息对象
	widget.RoomInfoWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template('room-info-wrapper-template'),
		init: function(parent, options) {
			this._super(parent);
			erp_instance.ktv_sale.ktv_room_point.bind("change:current_room", this.renderElement, this);
		},
		start: function() {
      //绑定收银员交接单按钮
      this.$el.on('click','.btn-casher-shift-report',_.bind(this.show_casher_shift_report,this));
      //绑定预定清单按钮
      this.$el.on('click','.btn-room-scheduled-list',_.bind(this.show_room_scheduled_list,this));
    },
    //显示收银员交接单
    show_casher_shift_report : function(){
			var win = new widget.CasherShiftReportWidget(null);
			win.ready.then(function() {
				$('#operate_area').html(win.$el);
				win.renderElement();
				win.start();
			});
    },
    //显示收银员交接单
    show_room_scheduled_list : function(){
			var win = new widget.RoomScheduledListWidget(null);
			win.ready.then(function() {
				$('#operate_area').html(win.$el);
				win.renderElement();
				win.start();
			});
    },

		set_display_by_fee_type: function() {
			var self = this;
			//需要根据计费方式不同显示不同的费用信息
			var cur_room = erp_instance.ktv_sale.ktv_room_point.get("current_room");
			if (!cur_room) return false;

			var fee_type_id = cur_room.get("fee_type_id")[0];
			new erp_instance.web.Model("ktv.fee_type").get_func("read")(fee_type_id, ['id', 'fee_type_code', 'name']).pipe(function(fee_type) {

				self.$(".room_fee,.minimum_fee,.minimum_fee_p,.buyout_fieldset,.buffet_fieldset,.buyout_config_lines,.buffet_config_lines,.buytime_fieldset,.hourly_fee_promotion_lines,.hourly_fee_lines,.member_hourly_fee_lines,.hourly_fee_p_lines").hide();
				//只收包厢费
				if (fee_type.fee_type_code == "only_room_fee") {
					self.$(".room_fee").show();
				}
				//只收钟点费
				if (fee_type.fee_type_code == "only_hourly_fee") {
					self.$(".hourly_fee,.hourly_fee_lines,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}

				//钟点费+包厢费
				if (fee_type.fee_type_code == "room_fee_plus_hourly_fee") {
					self.$(".room_fee,.hourly_fee,.hourly_fee_lines,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}
				//最低消费
				if (fee_type.fee_type_code == "minimum_fee") {
					self.$(".minimum_fee,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}

				//包厢费+最低消费
				if (fee_type.fee_type_code == "room_fee_plus_minimum_fee") {
					self.$(".room_fee,.minimum_fee,.buytime_fieldset").show();
				}

				//钟点费+最低消费
				if (fee_type.fee_type_code == "hourly_fee_plus_minimum_fee") {
					self.$(".hourly_fee_lines,.minimum_fee,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}

				//包厢费+钟点费+最低消费
				if (fee_type.fee_type_code == "room_fee_plus_hourly_fee_plus_minimum_fee") {
					self.$(".room_fee,.hourly_fee,.hourly_fee_lines,.minimum_fee,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}
				//按位钟点费
				if (fee_type.fee_type_code == "hourly_fee_p") {
					self.$(".hourly_fee_p_lines,.buytime_fieldset,.hourly_fee_promotion_lines").show();
				}

				//按位最低消费
				if (fee_type.fee_type_code == "minimum_fee_p") {
					self.$(".minimum_fee_p").show();
				}
				//买断
				if (fee_type.fee_type_code == "buyout_fee") {
					self.$(".buyout_config_lines,.buyout_fieldset").show();
					self.$(".buytime_fieldset").hide();
				}
				//自助餐
				if (fee_type.fee_type_code == "buffet") {
					self.$(".buffet_config_lines,.buffet_fieldset").show();
					self.$(".buytime_fieldset").hide();
				}
			});
		},
		renderElement: function() {
			var self = this;
			var the_room = erp_instance.ktv_sale.ktv_room_point.get("current_room");
			var the_room_fee_info = new model.RoomFeeInfo({
				room: the_room
			});
			the_room_fee_info.ready.then(function() {
				self.$el.html(self.template_fct({
					"room_info": the_room.export_as_json(),
					"room_fee_info": the_room_fee_info.export_as_json()
				}));
				self.set_display_by_fee_type();
			});
			return this;
		}
	});

	//预定widget
	widget.RoomScheduledWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template('room-scheduled-form-template'),
		init: function(parent, options) {
			this._super(parent, options);
			this.room = options.room;
			this.model = new erp_instance.ktv_sale.model.RoomScheduled({
				room_id: this.room.get("id")
			});
			this.ready = $.Deferred();
			var self = this;
			erp_instance.ktv_sale.ktv_room_point.get_rooms_by_state('free').pipe(function(result) {
				self.free_rooms = result;
				self.ready.resolve();
			});
		},
		start: function() {
			//隐藏其他元素
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();

			this.$el.on("click", '.btn-close-room-scheduled', _.bind(this.close, this));

			this.$form = $(this.$el).find("#room_scheduled_form");
			this.$form.find('#scheduled_time').datetimepicker({dateFormat : 'yy-mm-dd',timeFormat : 'hh:mm:ss'});
			this.$form.find('#scheduled_time').val(this.model.get('scheculed_time'));
			//包厢改变事件
			this.$form.find("#room_id").change(_.bind(this.on_change_room, this));
			//设置初始值
			if (this.room) this.$form.find('#room_id').val(this.room.id);
			//保存事件
			this.$(".btn-save").click(_.bind(this.save, this));
			return this;
		},
		close: function() {
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},

		renderElement: function() {
			var self = this;
			self.$el.html(self.template_fct({
				rooms: self.free_rooms,
				model: self.model.toJSON()
			}));
			return this;
		},
		//修改包厢
		on_change_room: function() {
			var self = this;
			erp_instance.ktv_sale.ktv_room_point.get_room(this.$form.find('#room_id').val()).pipe(function(b_room) {
				self.room = b_room;
				self.model.set({
					"room_id": b_room.id
				});

			});
		},
		//验证录入数据是否有效
		validate: function() {
			return this.$form.validate().form();
		},
		//保存预定信息
		save: function() {
			var self = this;
			if (!this.validate()) {
				return false;
			}
			//自界面获取各项值
			var context_scheduled_time = Date.parse(this.$("#scheduled_time").val());
			var utc_scheduled_time = erp_instance.web.datetime_to_str(context_scheduled_time);
	
			this.model.set({
				"scheduled_time": utc_scheduled_time,
        'room_id' : parseInt(this.$('#room_id').val()),
        'saler_id' : parseInt(this.$('#saler_id').val()),
        'guest_name' : this.$('#guest_name').val(),
        'persons_count' : parseInt(this.$('#persons_count').val()),
        'guest_phone' : this.$('#guest_phone').val()
			});
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "保存预定信息成功!"
				});
				self.close();
			};
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "保存预定信息失败!"
				});

			};
			this.model.push().pipe(function(result) {
				//更新包厢状态
				self.room.set(result["room"]);
				self.close();
			}).then(success_func, fail_func);
		}
	});

	//RoomOpensWidget 开房widget
	widget.RoomOpensWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("room-opens-template"),
		init: function(parent, options) {
			this._super(parent, options);
			//当前包厢
      this.room = options.room;
			this.model = new model.RoomOpens();
			this.member = new model.Member();
			this.member.bind("change", this.render_member_card_no, this);

      //判断是否是预定转开房
      if(options.room_scheduled)
      {
        var room_scheduled = options.room_scheduled;
        this.model.set({
          'guest_name' : room_scheduled.get('guest_name'),
          'persons_count' : room_scheduled.get('persons_count')
        })
        if(room_scheduled.get('saler_id'))
          this.model.set('saler_id',room_scheduled.get('saler_id')[0]);
      }
			this.ready = $.Deferred();
			var self = this;
			erp_instance.ktv_sale.ktv_room_point.get_rooms_by_state(['free','scheduled']).pipe(function(result) {
				self.free_rooms = result;
				self.ready.resolve();
			});
		},
		start: function() {
			//隐藏其他元素
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();
			this.$el.on('click', '.btn-close-room-opens', _.bind(this.close, this));
			//会员卡扫描
			this.$el.on('click', '.btn-member-card-read', _.bind(this.open_member_card_read_win, this));
			this.$el.on('click', '.btn-member-card-clear', _.bind(this.clear_member_card, this));
			//绑定相关事件
			this.$form = this.$("#room_opens_form");
			this.$("#room_id").val(this.room.get("id"));
      //TODO
			this.$("#saler_id").val(this.model.get("saler_id"));
			this.$el.on('change', "#room_id", _.bind(this.on_change_room, this));
			this.$el.on('click', ".btn-save-room-opens", _.bind(this.save, this));
		},
		close: function() {
			this.$el.off();
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},
		//打开会员卡读取窗口
		open_member_card_read_win: function() {
			var m_win = new widget.MemberCardReadWidget(null, {
				show: false,
				model: this.member
			});
			m_win.open();
		},
		//清除会员信息
		clear_member_card: function() {
			this.member.clear();
		},
		//重新显示会员信息
		render_member_card_no: function() {
			if (this.member.get("id")) {
				var member_card_no = this.member.get("member_card_no");
				var member_class = this.member.get("member_class_id");
				var member_name = this.member.get("name");
				var info = member_card_no + "[" + member_class[1] + "]" + "[" + member_name + "]";
				this.$("#member-card-no").html(info);
				this.$('.member-card-wrapper').removeClass('hide');
			}
			else {
				this.$("#member-card-no").empty();
				this.$('.member-card-wrapper').addClass('hide');
			}
		},

		renderElement: function() {
			var self = this;
			self.$el.html(self.template_fct({
				rooms: self.free_rooms,
				model: self.model.toJSON()
			}));
			self.render_member_card_no();
			return this;
		},
		validate: function() {
			//验证模型数据
			return this.$form.validate().form();
		},
		on_change_room: function() {
			var self = this;
			erp_instance.ktv_sale.ktv_room_point.get_room(this.$form.find('#room_id').val()).pipe(function(b_room) {
				self.room = b_room;
				self.model.set({
					"room_id": b_room.id
				});

			});
		},
		save: function() {
			var self = this;
			//保存数据
			if (!this.validate()) return false;
			this.model.set(this.$form.form2json());
			if (this.member.get("id")) this.model.set({
				"member_id": this.member.get("id")
			});
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "保存开房信息成功,请打印开房条!"
				});
				self.close();
				self.print();
			};
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "保存开房信息失败!"
				});

			};
			this.model.push().pipe(function(result) {
				//更新包厢状态
				self.room.set(result["room"]);
				//更新操作结果
				self.model.set(result['room_operate']);
				self.close();
			}).then(success_func, fail_func);
		},
		//打印开房条
		print: function() {
			var self = this;
			var room_fee_info = this.room.get_room_fee_info();
			room_fee_info.ready.then(function() {
				var template_var = {
					"room": self.room.export_as_json(),
					'room_fee_info': room_fee_info.export_as_json(),
					'room_opens': self.model.export_as_json()
				};
				var print_doc = $(qweb_template("room-opens-bill-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
			});
		}
	});

	//单个抵用券信息显示
	widget.SalesVoucherWidget = erp_instance.web.Widget.extend({
		tagName: "tr",
		template_fct: qweb_template('sales-voucher-template'),
		init: function(parent, options) {
			this.model = options.model;
			//model属性发生变化时,删除该信息
			this._super(parent, options);
		},
		renderElement: function() {
			this.$el.html(this.template_fct(this.model.toJSON()));
			return this;
		},
		start: function() {
			this.$(".btn-sales-voucher-clear").click(_.bind(this._remove, this));
		},
		//删除当前数据
		_remove: function() {
			this.model.clear();
			this.destroy();
		}
	});
	//抵用券列表显示界面
	widget.SalesVoucherListWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("sales-voucher-list-template"),
		init: function(parent, options) {
			this.model = options.model;
			this.model.bind('change', this._on_change, this);
			this._super(parent, options)
		},
		_on_change: function(the_sv) {
			var a = arguments;
			console.log(a);
			if (!the_sv.get("id")) this.model.remove(the_sv);
			this.renderElement();

		},
		renderElement: function() {
			this.$el.empty();
			this.$el.html(this.template_fct({}));
			this.model.each(function(s) {
				var w = new widget.SalesVoucherWidget(this, {
					model: s
				});
				w.appendTo(this.$('.table'));
			},
			this);
			return this;
		}
	});

	//结账基础类界面
	widget.BaseRoomCheckoutWidget = erp_instance.web.Widget.extend({
		//当前model
		model: new Backbone.Model(),
		init: function(parent, options) {
			this._super(parent, options);
			this.room = options.room;
			//会员信息
			this.member = new model.Member();
			//打折卡信息
			this.discount_card = new model.DiscountCard();
			//信用卡信息
			this.credit_card = new Backbone.Model();
      //优惠授权用户
      this.authorize_user = new model.User();
      //当优惠授权用户发生变化时,重新计算优惠费用
      this.authorize_user.on('change',this._on_authorize_user,this);
			//抵用券,可以使用多张抵用券
			this.sales_voucher_collection = new Backbone.Collection();
			this.sales_voucher_list_view = new widget.SalesVoucherListWidget(null, {
				model: this.sales_voucher_collection
			});
			//获取结账包厢费用信息
			this.room_fee_info = this.room.get_room_fee_info();
			this.ready = this.room_fee_info.ready;

			//model发生变化时,重新显示计费信息
			this.model.on('change', this._refresh_fee_table, this);
			//this.on('re_calculate_fee', this, this._refresh_fee_table);
      this.on('re_calculate_fee',this,this.on_re_calculate_fee);
			//抵用券发生变化时,计算抵用券费用
			this.sales_voucher_collection.bind('change', this._re_calculate_sales_voucher_fee, this);

			// table-bordered table-bordered table-bordered会员信息发生变化时重新计算费用
			this.member.bind("change", this.render_member_card_no, this);
			this.member.bind("change", this._re_calculate_fee, this);
			//打折卡信息发生变化时,重新计算费用
			this.discount_card.bind("change", this.render_discount_card_no, this);
			this.discount_card.bind("change", this._re_calculate_fee, this);

			//信用卡支付发生变化时,重绘界面
			this.credit_card.bind("change", this.render_credit_card_no, this);

			//当向服务器端重新请求计算费用时,需要保持客户端目前的信息,包括
			//当前的抵扣券信息
			//信用卡支付被自动设置为0
			//添加re_calculate_fee callback
			//计算优先级别1 免单 2 挂账 3 抵扣券 4 会员卡 5 信用卡
		},
		//向服务器端发起请求,子类可覆盖
		call_server_func: function() {
			return $.Deferred().done().promise();
		},
    //优惠授权用户发生变化时,重新计算打折费用
    _on_authorize_user : function(){
      if(!this.authorize_user.id){
        this.$('.on-credit-fee').attr('disabled',true);
        this.$('.on-credit-fee-limit').html('');
        this.$('.on-credit-fee').val(0.0);
        this.$('.free-fee').attr('disabled',true);
        this.$('.free-fee').val(0.0);
        this.$('.free-fee-limit').html('');
        this.$('.discounter-room-fee-discount-rate').attr('disabled',true);
        this.$('.min-room-fee-discount-rate').val(100);
        this.$('.discounter-room-fee-discount-rate').val(100);
        this.$('.authorize-user').html('');
        this.$('.remove-authorize-user').addClass('hide');
        return ;
      }
      this.model.set('discounter_id',this.authorize_user.id);
      this.$('.authorize-user').html(this.authorize_user.get('name'));
      this.$('.remove-authorize-user').removeClass('hide');
      //FIXME 如果有员工优惠操作时,会员卡,打折卡的优惠自动失效,都以员工优惠为准
      if(this.authorize_user.get('on_credit_power')){
        this.$('.on-credit-fee').attr('disabled',false);
        this.$('.on-credit-fee').val(0.0);
        this.$('.on-credit-fee-limit').html(this.authorize_user.get('on_credit_fee_limit'));
      }
      else{
        this.$('.on-credit-fee').attr('disabled',true);
        this.$('.on-credit-fee-limit').html('');
        this.$('.on-credit-fee').val(0.0);
      }
      if(this.authorize_user.get('free_power')){
        this.$('.free-fee').attr('disabled',false);
        this.$('.free-fee-limit').html(this.authorize_user.get('free_fee_limit'));
        this.$('.free-fee').val(0.0);
      }
      else{
        this.$('.free-fee').attr('disabled',true);
        this.$('.free-fee').val(0.0);
        this.$('.free-fee-limit').html('');
      }
      if(this.authorize_user.get('min_room_fee_discount') < 100){
        this.$('.discounter-room-fee-discount-rate').attr('disabled',false);
        this.$('.discounter-room-fee-discount-rate').val(this.authorize_user.get('default_room_fee_discount')).change();
        this.$('.min-room-fee-discount-rate').html(this.authorize_user.get('min_room_fee_discount'));
      }
      else{
        this.$('.discounter-room-fee-discount-rate').attr('disabled',true);
        this.$('.discounter-room-fee-discount-rate').val(100);
        this.$('.min-room-fee-discount-rate').html(100);
      }
      //NOTE 默认情况下,设置员工打折,挂账及免单不是默认设置的,但是如果有权限,也可进行这些操作
    },
		//重新计算费用
		_re_calculate_fee: function() {
			var self = this;
			return this.call_server_func().pipe(function(ret) {
				self.model.set(ret);
			}).then(function() {
				self.trigger('re_calculate_fee');
			});
		},
		//re_calculate_fee callback
		//子类可添加callback函数
		on_re_calculate_fee: function() {
      console.debug("on re_calcualte_fee");
			this._re_calculate_sales_voucher_fee();
			this._autoset_pay_type_member_card_fee();
		},
		//重新计算抵用券费用
		_re_calculate_sales_voucher_fee: function() {
			var sales_voucher_fee = 0;
			this.sales_voucher_collection.each(function(s) {
				sales_voucher_fee += s.get("as_money");
			});
			this.model.set({
				'sales_voucher_fee': sales_voucher_fee
			});
		},
		//重新显示费用列表
		_refresh_fee_table: function() {
			//需要将时间转换为本地时间
			console.debug("in _refresh_fee_table:" + this.model.toJSON());
			this.$('.open_time').html(this.model.get('context_open_time'));
			this.$('.close_time').html(this.model.get('context_close_time'));
			this.$('.consume_minutes').html(this.model.get('consume_minutes'));
			this.$('.present_minutes').html(this.model.get('present_minutes'));
			this.$('.total_minutes').html(this.model.get('total_minutes'));
			this.$('.prepay_fee').html(this.model.get('prepay_fee'));
			this.$('.room_fee').html(this.model.get('room_fee'));
			this.$('.service_fee_rate').html(this.model.get('service_fee_rate'));
			this.$('.service_fee').html(this.model.get('service_fee'));
			this.$('.hourly_fee').html(this.model.get('hourly_fee'));
			this.$('.minimum_fee').html(this.model.get('minimum_fee'));
			this.$('.minimum_fee_diff').html(this.model.get('minimum_fee_diff'));
			this.$('.changed_room_hourly_fee').html(this.model.get('changed_room_hourly_fee'));
			this.$('.changed_room_minutes').html(this.model.get('changed_room_minutes'));
			this.$('.merged_room_hourly_fee').html(this.model.get('merged_room_hourly_fee'));
			this.$('.total_fee').html(this.model.get('total_fee'));
			this.$('.total_discount_fee').html(this.model.get('total_discount_fee'));
			this.$('.discount_rate').html(this.model.get('discount_rate'));
			this.$('.total_after_discount_fee').html(this.model.get('total_after_discount_fee'));
			this.$('.total_after_discount_cash_fee').val(this.model.get('total_after_discount_cash_fee'));
			this.$('.member_card_fee').val(this.model.get('member_card_fee'));
			this.$('.credit_card_fee').val(this.model.get('credit_card_fee'));
			this.$('.sales_voucher_fee').val(this.model.get('sales_voucher_fee'));
			this.$('.free_fee').val(this.model.get('free_fee'));
			this.$('.act_pay_cash_fee').val(this.model.get('act_pay_cash_fee'));
			this.$('.cash_change').html(this.model.get('cash_change'));
		},
		//自动设置会员卡支付费用
		_autoset_pay_type_member_card_fee: function() {
			if (this.member.get("id")) {
				var balance = this.member.get('balance');
				//当前现金支付和会员卡支付金额合计
				var act_pay_cash_fee = this.model.get('act_pay_cash_fee');
				var member_card_fee = this.model.get('member_card_fee');
				//查看member_card余额,
				//如果余额大于当前应支付费用,则直接使用会员卡支付全部款项
				//如果余额小于当期应支付费用,则直接使用全部余额支付
				//如果余额为0,则不支付
				if (balance == 0.0) this.model.set({
					'member_card_fee': 0.0
				});
				else if (balance >= act_pay_cash_fee + member_card_fee) this.model.set({
					'member_card_fee': act_pay_cash_fee + member_card_fee
				});
				else this.model.set({
					'member_card_fee': balance
				});
			}
		},
		//重新显示会员信息
		render_member_card_no: function() {
			if (this.member.get("id")) {
				//显示member-card-wrapper
				var member_card_no = this.member.get("member_card_no");
				var member_class = this.member.get("member_class_id");
				var member_name = this.member.get("name");
				var info = member_card_no + "[" + member_class[1] + "]" + "[" + member_name + "]";
				this.$("#member-card-no").html(info);
				this.$('.member-card-wrapper').removeClass('hide');
				//会员卡/储值卡支付方式可用
				if (this.member.get('balance') > 0) {
					this.$('.member_card_fee').attr('disabled', false).focus().select();
				}
				this.$('.member_card_balance').html(this.member.get('balance'));
			}
			else {
				//隐藏member-card-wrapper
				this.$("#member-card-no").html(null);
				this.$('.member_card_fee').attr('disabled', true);
				this.$('.member_card_balance').html(0.0);
				this.$('.member-card-wrapper').addClass('hide');
				this.$('.member-card-balance-warning').addClass('hide');
				this.$('.btn-print,.btn-checkout').removeClass('disabled');
			}
		},
		//重新显示打折卡信息
		render_discount_card_no: function() {
			if (this.discount_card.get("id")) {
				//显示member-card-wrapper
				var card_no = this.discount_card.get("card_no");
				var card_type_id = this.discount_card.get("discount_card_type_id");
				var name = card_type_id[1];
				var info = name + "[" + card_no + "]";
				this.$("#discount-card-no").html(info);
				this.$('.discount-card-wrapper').removeClass('hide');
			}
			else {
				//隐藏member-card-wrapper
				this.$("#discount-card-no").html(null);
				this.$('.discount-card-wrapper').addClass('hide');
			}
		},
		//自动设置信用卡支付费用
		_autoset_pay_type_credit_card_fee: function() {
			if (this.credit_card.get("card_no")) {
				//默认设置信用卡支付金额为全款
				this.model.set({
					'credit_card_fee': this.model.get('cash_fee')
				});
			}
			else this.model.set({
				'credit_card_fee': 0.0
			});
		},
		//显示信用卡信息
		render_credit_card_no: function() {
			if (this.credit_card.get("card_no")) {
				var card_no = this.credit_card.get("card_no");
				this.$("#credit-card-no").html(card_no);
				this.$('.credit-card-wrapper').removeClass('hide');
				this.$('.credit_card_fee').attr('disabled', false).focus().select();
			}
			else {
				this.$("#credit-card-no").html(null);
				this.$('.credit_card_fee').attr('disabled', true);
				this.$('.credit-card-wrapper').addClass('hide');
			}
			this._autoset_pay_type_credit_card_fee();
		},

		start: function() {
			//隐藏其他元素
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();

			//抵扣券列表
			this.sales_voucher_list_view.$el = this.$('.sales-voucher-list');
			this.sales_voucher_list_view.renderElement();
			this.sales_voucher_list_view.start();

			//会员刷卡绑定
			this.$el.on('click', '.btn-member-card-read', _.bind(this.read_member_card, this));
			this.$el.on('click', '.btn-discount-card-read', _.bind(this.read_discount_card, this));
			this.$el.on('click', '.btn-member-card-clear', _.bind(this.member_card_clear, this));
			this.$el.on('click', '.btn-discount-card-clear', _.bind(this.discount_card_clear, this));
			this.$el.on("click", '.btn-credit-card-clear', _.bind(this.credit_card_clear, this));
			//
			this.$el.on("click", '.btn-checkout', _.bind(this._checkout, this));
			this.$el.on("click", '.btn-cancel', _.bind(this.close, this));
			//信用卡支付方式点击
			this.$el.on("click", '.btn-credit-card-input', _.bind(this.open_credit_card_input, this));
			//抵用券方式点击
			this.$el.on("click", '.btn-sales-voucher-input', _.bind(this.open_sales_voucher_input, this));
			//不同付款方式费用变化
			this.$el.on('change', '.member_card_fee', _.bind(this._onchange_member_card_fee, this));
			this.$el.on('change', '.credit_card_fee', _.bind(this._onchange_credit_card_fee, this));
			this.$el.on('change', '.act_pay_cash_fee', _.bind(this._onchange_act_pay_cash_fee, this));
      //优惠授权
      this.$el.on('click','.btn-authorize',_.bind(this._onclick_user_authorize,this));
      this.$el.on('click','.remove-authorize-user',_.bind(this._onclick_remove_user_authorize,this));
      //挂账金额变化//免单金额变化//折扣金额变化 三种权限可同时存在
      this.$el.on('change','.on-credit-fee,.free-fee,.discounter-room-fee-discount-rate',_.bind(this._onchange_user_discount_fee,this));
		},
    //优惠授权
    _onclick_user_authorize : function(){
      new widget.UserAuthorize(null,{authorize_user : this.authorize_user});
    },
    _onclick_remove_user_authorize : function(){
      this.authorize_user.clear();
      this.model.unset('discounter_id');
      //重新自服务端计算费用
      this._re_calculate_fee();
    },
    //用户优惠金额发生变化
    _onchange_user_discount_fee: function(){
      //由于挂账/免单/折扣可同时发生,三者计算顺序如下:
      //1 原会员卡、打折卡折扣取消
      //2 先计算用户折扣
      //3 然后计算免单、挂账
      var on_credit_fee = free_fee = room_fee_discount = 0.0;
      var validated_on_credit_fee = validated_free_fee = validated_discount = false;
      try{
        on_credit_fee = parseFloat(this.$('.on-credit-fee').val());
        free_fee = parseFloat(this.$('.free-fee').val());
        room_fee_discount = parseFloat(this.$('.discounter-room-fee-discount-rate').val());
        //判断输入金额是否符合要求
        if(on_credit_fee >= this.authorize_user.get('on_credit_fee_limit') || on_credit_fee > this.model.get('total_fee')){
          this.$('.on-credit-fee-warning').removeClass('hide');
          validated_on_credit_fee = false;
        }
        else{
          this.$('.on-credit-fee-warning').addClass('hide');
          this.model.set('on_credit_fee',on_credit_fee);
          validated_on_credit_fee = true;
        }
        if(free_fee >= this.authorize_user.get('free_fee_limit') || free_fee > this.model.get('total_fee')){
          validated_free_fee = false;
          this.$('.free-fee-warning').removeClass('hide');
        }
        else{
          this.$('free-fee-warning').addClass('hide');
          this.model.set('free_fee',free_fee);
          validated_free_fee = true;
        }
        if(room_fee_discount < this.authorize_user.get('min_room_fee_discount')){
          validated_discount = false;
          this.$('.discounter-room-fee-warning').removeClass('hide');
        }
        else{
          validated_discount = true;
          this.$('.discounter-room-fee-warning').addClass('hide');
          this.model.set('discounter_room_fee_discount_rate',room_fee_discount);
        }
        if(!validated_on_credit_fee || !validated_free_fee || !validated_discount){
          this.$('.btn-print,.btn-checkout').attr('disabled',true);
        }
        else
          this.$('.btn-print,.btn-checkout').attr('disabled',false);
      }
      catch(ex){
        return false;
      }
    },
		close: function() {
			this.$el.off();
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},
		//结账操作
		_checkout: function() {
			var self = this;
			//设置相关属性到model中去,不触发change事件
			this.model.set({
				'member_card': this.member_card,
				'discount_card': this.discount_card,
				'credit_card': this.credit_card,
				'sales_voucher_collection': this.sales_voucher_collection
			},
			{
				silent: true
			});
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "结账成功,请打印结账单!"
				});
			}
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "结账失败,请重新操作!"
				});

			};
			this.model.push().pipe(function(result) {
				self.model.set(result['room_operate']);
                erp_instance.ktv_sale.ktv_room_point.fetch_room(result['room'].id);
				//如果是换房,则还须更新changed_room的状态
				if (result['changed_room']) {
					var changed_room_id = result['changed_room'].id;
					erp_instance.ktv_sale.ktv_room_point.fetch_room(changed_room_id);
				}
			}).then(success_func, fail_func).then(function(){self.trigger('save_success');},function(){self.trigger('save_fail');});
		},
		//会员卡款金额变化的处理
		_onchange_member_card_fee: function() {
			var member_card_fee = parseFloat(this.$('.member_card_fee').val());
			var origin_member_card_fee = this.model.get('member_card_fee');
			if (member_card_fee > this.member.get('balance')) {
				this.$('.member-card-balance-warning').removeClass('hide');
				this.model.set({
					'member_card_fee': origin_member_card_fee
				});
				this.$('.member_card_fee').focus().select();
				this.$('.btn-print').addClass('disabled');
				this.$('.btn-checkout').addClass('disabled');
			}
			else {
				this.$('.member-card-balance-warning').addClass('hide');
				this.model.set({
					'member_card_fee': member_card_fee
				});
				this.$('.btn-print').removeClass('disabled');
				this.$('.btn-checkout').removeClass('disabled');

			}
		},
		//信用卡付款金额变化的处理
		_onchange_credit_card_fee: function() {
			console.debug("credit_card_fee changed");
			var credit_card_fee = parseFloat(this.$('.credit_card_fee').val());
			this.model.set({
				'credit_card_fee': credit_card_fee
			});
		},
		//实付金额变化
		_onchange_act_pay_cash_fee: function() {
			var act_pay_cash_fee = parseFloat(this.$('.act_pay_cash_fee').val());
			this.model.set({
				'act_pay_cash_fee': act_pay_cash_fee
			});

		},
		//读取会员卡
		read_member_card: function() {
			var w = new widget.MemberCardReadWidget(null, {
				model: this.member
			});
		},
		//读取打折卡
		read_discount_card: function() {
			var w = new widget.DiscountCardReadWidget(null, {
				model: this.discount_card
			});

		},
		//打开信用卡录入界面
		open_credit_card_input: function() {
			var w = new widget.CreditCardInputWidget(null, {
				model: this.credit_card
			});
		},
		//打开抵用券录入界面
		open_sales_voucher_input: function() {
			var w = new widget.SalesVoucherInputWidget(null, {
				model: this.sales_voucher_collection
			});

		},
		//清除信用卡记录
		credit_card_clear: function() {
			this.$('#credit_card_no').attr("disabled", true);
			this.credit_card.clear();
			this.model.set({
				'credit_card_fee': 0
			});
		},

		//清除会员卡信息
		member_card_clear: function() {
			this.$('#member_card_no').attr("disabled", true);
			this.member.clear();
			this.model.set({
				'member_card_fee': 0
			});
		},
		//清除打折卡信息
		discount_card_clear: function() {
			this.$('#discount_card_no').attr("disabled", true);
			this.discount_card.clear();
		}
	});

	//包厢买断界面
	widget.RoomCheckoutBuyoutWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-buyout-template"),
		model: new model.RoomCheckoutBuyout(),
    init: function(parent, options) {
			this._super(parent, options);
      //判断是否是预定转买断
      if(options.room_scheduled)
      {
        var room_scheduled = options.room_scheduled;
        this.model.set({
          'guest_name' : room_scheduled.get('guest_name'),
          'persons_count' : room_scheduled.get('persons_count')
        })
        if(room_scheduled.get('saler_id'))
          this.model.set('saler_id',room_scheduled.get('saler_id')[0]);
      }
		},

		renderElement: function() {
			var self = this;
				self.$el.html(self.template_fct({
					"model": self.model.export_as_json(),
					"room": self.room.export_as_json(),
					"room_fee_info": self.room_fee_info.export_as_json()
				}));
			return this;
		},
		//买断设置发生变化
		_onchange_buyout_config_id: function() {
			this._re_calculate_fee();
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_checkout_buyout').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			var buyout_config_id = this.$('#buyout_config_id').val();
			var context = {
				room_id: this.room.get("id"),
				buyout_config_id: parseInt(buyout_config_id)
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");

			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
			//买断变化事件
			this.$('#buyout_config_id').change(_.bind(this._onchange_buyout_config_id, this));
      this.on('save_success',this,this.print);
			//如果当前无可用买断,则确定按钮不可用
			if (this.room_fee_info.get_active_buyout_config_lines().length == 0) {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "当前时间没有可用的买断设置!"
				});
				this.close();
			}
			else 
      {
        this.$('#saler_id').val(this.model.get('saler_id'));
        this._onchange_buyout_config_id();

      }
		},
    //打印结账单
    print : function(){
      //需要处理以下数据
      //room 当前包厢
      //sum_paid_info 当前结账信息
      //room_checkout_buyout 买断结账对象
      var self = this;
      var sum_paid_info;
      new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
      .pipe(function(s_info){
        sum_paid_info = s_info;
        sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
      }).then(function(){
        var template_var = {
          "room": self.room.export_as_json(),
          "sum_paid_info" : sum_paid_info,
          'room_checkout_buyout': self.model.export_as_json()
        };
        var print_doc = $(qweb_template("room-checkout-buyout-print-template")(template_var));
        //处理可见元素
        var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});

    }
	});
	//包厢换房-买断界面
	widget.RoomChangeCheckoutBuyoutWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-change-checkout-buyout-template"),
		model: new model.RoomChangeCheckoutBuyout(),
		init: function(parent, options) {
      this._super(parent,options);
      var self = this;
      this.ready_init = $.Deferred();
      self.ready.then(function(){
        var free_rooms = erp_instance.ktv_sale.ktv_room_point.get_rooms_free_and_has_buyout_config();
        free_rooms.ready.then(function() {
          self.free_rooms = free_rooms.toJSON();
          self.ready_init.resolve();
        });
      });

			//获取当前包厢最后一次结账信息
			//重新计算云覅时,刷新界面上的相关显示
			this.on('re_calculate_fee', this, this._refresh_last_checkout);
		},
		renderElement: function() {
			var self = this;
      self.$el.html(self.template_fct({
        "model": self.model.toJSON(),
        "origin_room": self.room.export_as_json(),
        "free_rooms": self.free_rooms
      }));
			return this;
		},
		//显示买断列表
		_render_buyout_select: function(buyout_list) {
			this.$('.buyout-select-placeholder').empty();
			this.$('.buyout-select-placeholder').html(qweb_template("buyout-select-template")({
				'buyout_config_lines': buyout_list
			}));
			this.$('#changed_buyout_config_id').off();
			this.$('#changed_buyout_config_id').on('change', _.bind(this._onchange_buyout_config_id, this));
		},
		//刷新包厢最后一次结账信息
		_refresh_last_checkout: function() {},

		//选择包厢发生变化
		_onchange_room_id: function() {
			var self = this;
			erp_instance.ktv_sale.ktv_room_point.get_room(this.$('#changed_room_id').val()).pipe(function(b_room) {
				var changed_room = b_room;
        self.changed_room = changed_room;
				self.changed_room_fee_info = b_room.get_room_fee_info();
				self.changed_room_fee_info.ready.then(function() {
					info = self.changed_room_fee_info.export_as_json();
					self._render_buyout_select(info.active_buyout_config_lines);
					self._re_calculate_fee();
				});
			});
		},
		//买断设置发生变化
		_onchange_buyout_config_id: function() {
			this._re_calculate_fee();
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_change_checkout_buyout').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			var buyout_config_id = this.$('#changed_buyout_config_id').val();
			var context = {
				room_id: this.room.get("id"),
				changed_room_id: this.changed_room.get("id"),
				changed_buyout_config_id: parseInt(buyout_config_id)
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");
			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
			//买断变化事件
			this.$('#changed_room_id').change(_.bind(this._onchange_room_id, this));
      this.on('save_success',this,this.print);
			//如果当前无可用买断,则确定按钮不可用
			if (this.room_fee_info.get_active_buyout_config_lines().length == 0) {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "当前时间没有可用的买断设置!"
				});
				this.close();
			}
			else this._onchange_room_id();
		},
    //打印买断换房条
    print : function(){
      //需要提取以下数据
      //room_change_checkout_buyout 买钟换房信息
      //origin_room 原包厢
      //changed_room 新包厢信息
      //p_checkout  上条最近结账信息
      //l_checkout  最近一条结账信息

      var self = this;
      var origin_room = self.room;

      //新包厢信息 上次预售结账信息 本次结账信息
      var changed_room,p_checkout,l_checkout;
      var get_last_two_checkout = function(){
        return new erp_instance.web.Model('ktv.room_operate').get_func('last_two_presale_checkout')(self.model.get('room_operate_id')[0])
        .pipe(function(ret){
          p_checkout =  ret[0];
          l_checkout = ret[1]
          p_checkout.context_open_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_close_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_open_only_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('HH:mm');
          p_checkout.context_close_only_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('HH:mm');
 
          l_checkout.context_open_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_close_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_open_only_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('HH:mm');
          l_checkout.context_close_only_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('HH:mm');
 
          return ret;
        });
      };
      var get_changed_room = function(){
        //self.get('changed_room_id')在正确保存后,changed_room_id变为[id,name]
        return erp_instance.ktv_sale.ktv_room_point.get_room(self.model.get('changed_room_id')[0]).pipe(function(b_room) {
          changed_room = b_room;
          return b_room;
        });
      };
      $.when(get_last_two_checkout(),get_changed_room()).then(function(){
        var template_var = {
					"origin_room": origin_room.export_as_json(),
          'changed_room' : changed_room.export_as_json(),
					'room_change_checkout_buyout': self.model.export_as_json(),
          'p_checkout' : p_checkout,
          'l_checkout' : l_checkout
				};
				var print_doc = $(qweb_template("room-change-checkout-buyout-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});
    }
	});

	//预售-买钟界面
	widget.RoomCheckoutBuytimeWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-buytime-template"),
		model: new model.RoomCheckoutBuytime(),
		init: function(parent, options) {
			this._super(parent, options);
			this.on('re_calculate_fee', this, this._refresh);
      //判断是否是预定转买钟点
      if(options.room_scheduled)
      {
        var room_scheduled = options.room_scheduled;
        this.model.set({
          'guest_name' : room_scheduled.get('guest_name'),
          'persons_count' : room_scheduled.get('persons_count')
        })
        if(room_scheduled.get('saler_id'))
          this.model.set('saler_id',room_scheduled.get('saler_id')[0]);
      }
		},
		//重绘制界面
		_refresh: function() {
			//更新赠送时长,到钟时间
			console.debug("重新计算赠送时间:" + this.model.get('present_minutes'));
			this.$("#present_minutes").val(this.model.get("present_minutes"));
			console.debug("重新计算到钟时间:" + this.model.get('context_close_time'));
			this.$("#close_time").val(this.model.get("context_close_time"));
		},

		renderElement: function() {
			var self = this;
			this.$el.html(self.template_fct({
				"model": self.model.toJSON(),
				"room": self.room.toJSON(),
				"price_classes": erp_instance.ktv_sale.ktv_room_point.get('price_classes').toJSON()
			}));
			return this;
		},
		//相关字段发生变化
		_onchange_fields: function() {
			this._re_calculate_fee();
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_checkout_buytime').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			var persons_count = parseInt(this.$('#persons_count').val());
			var price_class_id = parseInt(this.$("#price_class_id").val());
			var consume_minutes = parseInt(this.$("#consume_minutes").val());
			var context = {
				"room_id": this.room.get("id"),
				"price_class_id": price_class_id,
				"consume_minutes": consume_minutes,
				'persons_count': persons_count
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");

			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
			//设置计费方式为当前包厢默认计费方式
      this.$('saler_id').val(this.model.get('saler_id'));
			this.$("#price_class_id,#consume_minutes,#persons_count").change(_.bind(this._onchange_fields, this));
      this.on('save_success',this,this.print);
			this._onchange_fields();
		},
    //打印买钟结账单
    print : function(){
      //需要提取以下数据
      //room 当前包厢
      //sum_paid_info 结账信息
      //room_checkout_buytime 当前买钟结账信息
      var self = this;
      var sum_paid_info;
      new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
      .pipe(function(s_info){
        sum_paid_info = s_info;
        sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
      }).then(function(){
        var template_var = {
          "room": self.room.export_as_json(),
          "sum_paid_info" : sum_paid_info,
          'room_checkout_buytime': self.model.export_as_json()
        };
        var print_doc = $(qweb_template("room-checkout-buytime-print-template")(template_var));
        //处理可见元素
        var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});
    }
	});

	//包厢结账-正常开房
	widget.RoomCheckoutWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-checkout-template"),
		model: new model.RoomCheckout(),

		init: function(parent, options) {
			this._super(parent, options);
		},
		renderElement: function() {
			var self = this;
			this.$el.html(self.template_fct({
				"model": self.model.toJSON(),
				"room": self.room.toJSON()
			}));
			return this;
		},
		//相关字段发生变化
		_onchange_fields: function() {
			console.debug('RoomCheckoutWidget#_on_change_fields');
			this._re_calculate_fee();
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_checkout').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			var fee_type_id = parseInt(this.$("#fee_type_id").val());
			var price_class_id = parseInt(this.$("#price_class_id").val());
			var context = {
				"room_id": this.room.get("id"),
				"fee_type_id": fee_type_id,
				"price_class_id": price_class_id
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");

			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
			//设置计费方式为当前包厢默认计费方式
			this.$("#fee_type_id,#price_class_id").change(_.bind(this._onchange_fields, this));
			this.$("#fee_type_id").val(this.room.get("fee_type_id")[0])
      this.on('save_success',this,this.print);
			this._onchange_fields();
		},
    //重写打印事件
		print: function() {
			var self = this;
      console.log("enter print events");
      //获取钟点费计费信息
      var room_hourly_fee_line_ids = self.model.get('room_hourly_fee_line_ids');
      //需要先缓存sum_paid_info,因包厢结账后,sum_paid_info将不存在
      var sum_paid_info,hourly_fee_lines;
			$.when(
        new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
        .pipe(function(s_info){
          sum_paid_info = s_info;
          sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
        }),
        new erp_instance.web.Model('ktv.room_hourly_fee_line').get_func('read')(room_hourly_fee_line_ids,[])
        .pipe(function(h_lines){
          hourly_fee_lines = h_lines;
          //计算本地时间
          _.each(hourly_fee_lines,function(l){
            l.context_time_from = erp_instance.web.str_to_datetime(l.time_from).toString('HH:mm');
            l.context_time_to = erp_instance.web.str_to_datetime(l.time_to).toString('HH:mm');
          });
        }))
        .then(function(){
          var template_var = {
					"room": self.room.export_as_json(),
          "room_checkout" : self.model.export_as_json(),
          "sum_paid_info" : sum_paid_info,
          "room_hourly_fee_lines" : hourly_fee_lines
				};
				var print_doc = $(qweb_template("room-checkout-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
        }).then(function(){self.close();});
    }
	});

	//包厢换房-买钟界面
	widget.RoomChangeCheckoutBuytimeWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-change-checkout-buytime-template"),
		model: new model.RoomChangeCheckoutBuytime(),
		init: function(parent, options) {
			this._super(parent, options);
      var self = this;
      this.ready_init = $.Deferred();
      self.ready.then(function(){
        erp_instance.ktv_sale.ktv_room_point.get_rooms_by_state('free').pipe(function(result) {
          self.free_rooms = result;
          self.ready_init.resolve();
        });
      });
		},
    renderElement: function() {
      var self = this;
      self.$el.html(self.template_fct({
        "model": self.model.toJSON(),
        //原包厢对象
        "origin_room": self.room.toJSON(),
        //当前空闲包厢
        "free_rooms": self.free_rooms
      }));
      return this;
		},

		//选择包厢发生变化
		_onchange_room_id: function() {
			var self = this;
			var changed_room_id = self.$("#changed_room_id").val();
			erp_instance.ktv_sale.ktv_room_point.get_room(changed_room_id).pipe(function(b_room) {
				self.changed_room_fee_info = b_room.get_room_fee_info();
				self.changed_room = b_room;
				self.changed_room_fee_info.ready.then(function() {
					info = self.changed_room_fee_info.export_as_json();
					self._re_calculate_fee();
				});
			});
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_change_checkout_buytime').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			var context = {
				room_id: this.room.get("id"),
				changed_room_id: this.changed_room.get("id")
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");
			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
      this._onchange_room_id();
      this.on('save_success',this,this.print);
			this.$el.on('change', '#changed_room_id', _.bind(this._onchange_room_id, this));
		},
    //打印买钟换房条
    print : function(){
      //需要提取以下数据
      //room_change_checkout_buytime 买钟换房信息
      //origin_room 原包厢
      //changed_room 新包厢信息
      //p_checkout  上条最近结账信息

      var self = this;
      var origin_room = self.room;

      //新包厢信息 上次预售结账信息 本次结账信息
      var changed_room,p_checkout,l_checkout;
      var get_last_two_checkout = function(){
        return new erp_instance.web.Model('ktv.room_operate').get_func('last_two_presale_checkout')(self.model.get('room_operate_id')[0])
        .pipe(function(ret){
          p_checkout =  ret[0];
          l_checkout = ret[1]
          p_checkout.context_open_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_close_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_open_only_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('HH:mm');
          p_checkout.context_close_only_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('HH:mm');
 
          l_checkout.context_open_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_close_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_open_only_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('HH:mm');
          l_checkout.context_close_only_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('HH:mm');
 
          return ret;
        });
      };
      var get_changed_room = function(){
        //self.get('changed_room_id')在正确保存后,changed_room_id变为[id,name]
        return erp_instance.ktv_sale.ktv_room_point.get_room(self.model.get('changed_room_id')[0]).pipe(function(b_room) {
          changed_room = b_room;
          return b_room;
        });
      };
      $.when(get_last_two_checkout(),get_changed_room()).then(function(){
        var template_var = {
					"origin_room": origin_room.export_as_json(),
          'changed_room' : changed_room.export_as_json(),
					'room_change_checkout_buytime': self.model.export_as_json(),
          'p_checkout' : p_checkout,
          'l_checkout' : l_checkout
				};
				var print_doc = $(qweb_template("room-change-checkout-buytime-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});
    }
  });

	//续钟界面
	widget.RoomCheckoutBuytimeContinueWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-checkout-buytime-continue-template"),
		model: new model.RoomCheckoutBuytimeContinue(),
		init: function(parent, options) {
			this._super(parent, options);
		},
		renderElement: function() {
			var self = this;
			this.$el.html(self.template_fct({
				model: self.model.toJSON(),
				//原包厢对象
				room: self.room.export_as_json()
			}));
			return this;
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_checkout_buytime_continue').get_func('re_calculate_fee')(context);
		},
		//续钟时间发生变化
		_onchange_consume_minutes: function() {
			this._re_calculate_fee();
		},
		//获取当前上下文环境
		_get_context: function() {
			var consume_minutes = parseFloat(this.$('#consume_minutes').val());
			var context = {
				room_id: this.room.get("id"),
				consume_minutes: consume_minutes
			};
			if (this.member.get("id")) context.member_id = this.member.get("id");
			if (this.discount_card.get("id")) context.discount_card_id = this.discount_card.get("id");

			return context;
		},
		start: function() {
			this._super();
			this.$('#consume_minutes').on('change', _.bind(this._onchange_consume_minutes, this));
			this.on('save_success',this,this.print);
			this._re_calculate_fee();
		},
    print : function(){
      //打印续钟单,需要获取以下数据
      //room 当前包厢
      //room_continue 续钟操作对象
      var self = this;
      var sum_paid_info;
      new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
      .pipe(function(s_info){
        sum_paid_info = s_info;
        sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
      }).then(function(){
        var template_var = {
          "room": self.room.export_as_json(),
          "sum_paid_info" : sum_paid_info,
          'room_continue': self.model.export_as_json()
        };
        var print_doc = $(qweb_template("room-checkout-buytime-continue-print-template")(template_var));
        //处理可见元素
        var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});
    }
	});

	//退钟界面
	widget.RoomCheckoutBuytimeRefundWidget = widget.BaseRoomCheckoutWidget.extend({
		template_fct: qweb_template("room-checkout-buytime-refund-template"),
		model: new model.RoomCheckoutBuytimeRefund(),
		init: function(parent, options) {
			this._super(parent, options);
		},
		renderElement: function() {
			var self = this;
			this.$el.html(self.template_fct({
				model: self.model.toJSON(),
				//原包厢对象
				room: self.room.export_as_json()
			}));
			return this;
		},

		call_server_func: function() {
			var self = this;
			var context = this._get_context();
			return new erp_instance.web.Model('ktv.room_checkout_buytime_refund').get_func('re_calculate_fee')(context);
		},
		//获取当前上下文环境
		_get_context: function() {
			return {
				"room_id": this.room.id
			};
		},
		start: function() {
			this._super();
      this.on('save_success',this,this.print);
			this._re_calculate_fee();
		},
    //打印退钟单
    print : function(){
      //需要获取以下数据 
      //room 当前包厢信息
      //room_refund 当前退钟信息
      //p_checkout 最近一次结账信息(不包括本次退钟信息)
      var self = this;
           
      //上次预售结账信息 本次结账信息
      var sum_paid_info,p_checkout,l_checkout;
      //合计付款信息
      var get_sum_paid = function(){
        return new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
        .pipe(function(s_info){
          sum_paid_info = s_info;
          sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
          return sum_paid_info;
        });
      };

      var get_last_two_checkout = function(){
        return new erp_instance.web.Model('ktv.room_operate').get_func('last_two_presale_checkout')(self.model.get('room_operate_id')[0])
        .pipe(function(ret){
          p_checkout =  ret[0];
          l_checkout = ret[1]
          p_checkout.context_open_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_close_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          p_checkout.context_open_only_time = erp_instance.web.str_to_datetime(p_checkout.open_time).toString('HH:mm');
          p_checkout.context_close_only_time = erp_instance.web.str_to_datetime(p_checkout.close_time).toString('HH:mm');
 
          l_checkout.context_open_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_close_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('yyyy-MM-dd HH:mm');
          l_checkout.context_open_only_time = erp_instance.web.str_to_datetime(l_checkout.open_time).toString('HH:mm');
          l_checkout.context_close_only_time = erp_instance.web.str_to_datetime(l_checkout.close_time).toString('HH:mm');
          return ret;
        });
      };
      $.when(get_last_two_checkout(),get_sum_paid()).then(function(){
        var template_var = {
					"room": self.room.export_as_json(),
					'room_refund': self.model.export_as_json(),
          'sum_paid_info' : sum_paid_info,
          'p_checkout' : p_checkout,
          'l_checkout' : l_checkout
				};
				var print_doc = $(qweb_template("room-checkout-buytime-refund-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
      }).then(function(){self.close();});
  
    }
	});

	//换房-正常开房界面
	widget.RoomChangeWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("room-change-template"),
		init: function(parent, options) {
			this._super(parent, options);
			//当前包厢
			this.room = options.room;
			this.model = new model.RoomChange();
			this.model.set("room_id", this.room.id);
			this.ready_init = $.Deferred();
			this.room_fee_info = this.room.get_room_fee_info();
            var self = this;
			this.room_fee_info.ready.then(function(){
                erp_instance.ktv_sale.ktv_room_point.get_rooms_by_state('free').pipe(function(result) {
				self.free_rooms = result;
				self.ready_init.resolve();
                });
            });
		},
		start: function() {
			//隐藏其他元素
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();
			this.$el.on('click', '.btn-close-room-change', _.bind(this.close, this));
			//绑定相关事件
			this.$form = this.$("#room_change_form");
			this.$("#room_id").val(this.room.get("id"));
			this.$el.on('change', "#changed_room_id", _.bind(this.on_change_room, this));
			this.$el.on('click', ".btn-save-room-change", _.bind(this.save, this));
			this.model.on("change:changed_room_id", this._refresh_on_change_room, this);
			this.on_change_room();
		},
		close: function() {
			this.$el.off();
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},
		renderElement: function() {
			var self = this;
            self.$el.html(self.template_fct({
                rooms: self.free_rooms,
                room: self.room.export_as_json(),
                room_fee_info: self.room_fee_info.export_as_json()
            }));
			return this;
		},
		on_change_room: function() {
			this.model.set({
				"changed_room_id": this.$('#changed_room_id').val()
			});
		},
		//换房时更新界面
		_refresh_on_change_room: function() {
			console.debug("RoomChange#_refresh_on_change_room");
			var self = this;
			//获取当前换房信息
			erp_instance.ktv_sale.ktv_room_point.get_room(this.model.get('changed_room_id')).pipe(function(b_room) {
				var changed_room_fee_info = b_room.get_room_fee_info();
				changed_room_fee_info.ready.then(function() {
					self.$('#changed_hourly_fee').val(changed_room_fee_info.get('hourly_fee'));
					self.$('#changed_room_fee').val(changed_room_fee_info.get('room_fee'));
					self.$('#changed_minimum_fee').val(changed_room_fee_info.get('minimum_fee'));
				});
			});
		},
		save: function() {
			var self = this;
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "保存换房信息成功,打印换房条!"
				});
			};
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "保存换房信息失败!"
				});

			};
			this.model.push().pipe(function(result) {
				self.model.set(result['room_operate'],{silent : true});
        self.model.set({
          'changed_room_id' : result['room_operate'].changed_room_id[0],
        });
        erp_instance.ktv_sale.ktv_room_point.fetch_room(result['room'].id);
				//如果是换房,则还须更新changed_room的状态
				if (result['changed_room']) {
					var changed_room_id = result['changed_room'].id;
					erp_instance.ktv_sale.ktv_room_point.fetch_room(changed_room_id);
				}
			}).then(success_func, fail_func).then(_.bind(self.print,self)).then(_.bind(self.close,self));
		},
		//打印换房条
		print: function() {
			var self = this;
      //需要获取以下信息
      //原包厢信息 原包厢费用信息
      //新包厢信息 新包厢费用信息
      //原消费信息 sum_paid_info
      var origin_room = self.room;
			var origin_room_fee_info = self.room.get_room_fee_info();

      var changed_room,changed_room_fee_info,sum_paid_info;
      var get_sum_paid = function(){
        return new erp_instance.web.Model('ktv.room_operate').get_func('calculate_sum_paid_info')(self.model.get('room_operate_id')[0])
        .pipe(function(s_info){
          sum_paid_info = s_info;
          sum_paid_info.context_open_time = erp_instance.web.str_to_datetime(s_info.open_time).toString('yyyy-MM-dd HH:mm');
          return sum_paid_info;
        });
      };
      var get_changed_room_info = function(){
        return erp_instance.ktv_sale.ktv_room_point.get_room(self.model.get('changed_room_id')).pipe(function(b_room) {
          changed_room = b_room;
          return b_room;
        }).pipe(function(b_room){
          changed_room_fee_info = b_room.get_room_fee_info();
          return changed_room_fee_info;
        });
      };
     
      $.when(origin_room_fee_info.ready,get_changed_room_info(),get_sum_paid()).then(function(){
        var template_var = {
					"origin_room": origin_room.export_as_json(),
					'origin_room_fee_info': origin_room_fee_info.export_as_json(),
					'room_change': self.model.toJSON(),
          'changed_room' : changed_room.export_as_json(),
          'changed_room_fee_info' : changed_room_fee_info.export_as_json(),
          'sum_paid_info' : sum_paid_info
				};
				var print_doc = $(qweb_template("room-change-print-template")(template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
      });
		}
	});
	//收银员交班对账界面
	widget.CasherShiftReportWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("casher-shift-report-template"),
		init: function(parent, options) {
      var self = this;
			this._super(parent, options);
			//当前包厢
			this.model = new model.CasherShiftReport();
      this.ready = $.Deferred();
			new erp_instance.web.Model('ktv.casher_shift_report').get_func('get_shift_report')().pipe(function(ret){
        self.model.set(ret);
        self.ready.resolve();
      });
		},
		start: function() {
			//隐藏其他元素
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();
      this.$el.on('click','.btn-close-casher-shift-report',_.bind(this.close,this));
      this.$el.on('click','.btn-print',_.bind(this.print,this));
      //如果收银交接单已存在,则隐藏save按钮
      if(this.model.get('id'))
        this.$('.btn-save-casher-shift-report').addClass('disabled');
      else
        this.$el.on('click','.btn-save-casher-shift-report',_.bind(this.save,this));

		},
		close: function() {
			this.$el.off();
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},
		renderElement: function() {
			var self = this;
      self.$el.html(self.template_fct({
          report: self.model.toJSON()
        }));
			return this;
		},

		save: function() {
			var self = this;
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "保存交班信息成功,打印交班结账条!"
				});
        self.$('.btn-save-casher-shift-report').addClass('disabled')
			};
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "保存交班息失败!"
				});
        self.$('.btn-save-casher-shift-report').removeClass('disabled')

			};
			this.model.push().then(success_func, fail_func).then(_.bind(self.print,self));
		},
		//打印
		print: function() {
			var self = this;
			var print_doc = $(qweb_template("casher-shift-report-partial")({report : self.model.toJSON()}));
			//处理可见元素
			var print_doc = print_doc.jqprint();
      }
		});

	//刷卡界面
	widget.ScanCardWidget = widget.BootstrapModal.extend({
    template: "scan-card-template",
		osv_name: 'ktv.member',
		domain: function() {
		var input_card_no = this.$('#input_card_no').val();
			return [["member_card_no", '=', input_card_no]]
		},
		init: function(parent, options) {
			//传入界面的对象
			this.model = options.model;
			//当前查询到的对象信息
			this.searched_model = new Backbone.Model();
			//this.searched_model.bind("change", this._ok_close, this);
			this._super(parent, options);
		},
		post_open: function() {
			this.$('#input_card_no').focus();
		},

		renderElement: function() {
			this.$el.html(QWeb.render(this.template,{}));
			return this;
		},
		start: function() {

			this.$('#input_hide').css({'position' : 'absolute','left' : '-9999px'});
			this.$el.on("click", '#btn_search', _.bind(this._search, this));
      this.$el.on('change','#input_hide',_.bind(this._onchange,this));
      this.$el.on('keypress',_.bind(this._on_enter,this));
		},
    _onchange : function(){
      var card_no = this.$('#input_hide').val();
      this.$('#input_card_no').val(card_no);
    },
    //点击回车键
    _on_enter : function(evt){
      if(evt.which == 13)
        this._search();
    },

		//确认关闭
		_ok_close: function() {
			if (this.searched_model.get("id") || this.searched_model.get('card_no')) {
				this.model.set(this.searched_model.attributes);
				this.close();
			}
		},
		//根据member_code查找member
		_search: function() {
			var self = this;
			var input_card_no = this.$('#input_card_no').val();
			if (input_card_no != "") {
				model.fetch_by_osv_name(this.osv_name, {
					"domain": this.domain()
				}).pipe(function(result) {
					//未查到卡信息
					if (result.length == 0) {
						self.searched_model.clear();
						self.$(".alert").removeClass('hide');
					}
					else {
						self.$(".alert").addClass('hide');
						self.searched_model.set(result[0]);
            self.trigger('search_ok')
					}
				})
			}
			this.$("#input_hide").focus().select();
		}
	});

	//会员查询界面
	widget.MemberCardReadWidget = widget.ScanCardWidget.extend({
    start : function(){
			this._super.apply(this, arguments);
      this.$('#input_card_no').attr('readonly',true);
      this.$el.on('click',_.bind(this._setfocus,this));
      this.on('search_ok',this,this._show_password_win);
      this.on('search_ok',this,this.close);
    },
		post_open: function() {
			this.$('#input_hide').focus();
		},

    _setfocus : function(){
			this.$("#input_hide").focus().select();
    },
    _show_password_win : function(){
      //弹出密码录入窗口
      var password_win = new widget.MemberCardPasswordWidget(null,{
        member_card : this.searched_model,
        model : this.model
      });
    }
  });
	//刷卡界面
	widget.MemberCardPasswordWidget = widget.BootstrapModal.extend({
		template: "member-card-password-template",
		init: function(parent, options) {
			this._super(parent, options);
			//传入界面的对象
			this.member_card = options.member_card;
      this.model = options.model;
		},
    post_open : function(){
      this.$('.input-password').focus().select();
    },
		renderElement: function() {
			this.$el.html(QWeb.render(this.template,{}));
			return this;
		},
		start: function() {
			this.$el.on("click",'.btn-ok', _.bind(this._ok, this));
      this.$el.on('click',_.bind(this._setfocus,this));
      this.$el.on('keypress',_.bind(this._on_enter,this));
		},
    _setfocus : function(){
      this.$('.input-password').focus().select();
    },
    //点击回车键
    _on_enter : function(evt){
      if(evt.which == 13)
        this._ok();
    },
		_ok: function() {
			var self = this;
			var input_password = this.$('.input-password').val();
			if (input_password != "") {
        new erp_instance.web.Model('ktv.member',{},[['id','=',self.member_card.get('id')],['card_password','=',input_password]]).query().all().pipe(function(result){
					//未查到卡信息
					if (result.length == 0) {
						self.member_card.set('validate',false);
						self.$(".alert").removeClass('hide');
            self.$(".input-password").focus().select();
					}
					else {
						self.$(".alert").addClass('hide');
						self.model.set(self.member_card.attributes);
            self.close();
					}
				});
			}
		}
	});

	//打折卡查询界面
	widget.DiscountCardReadWidget = widget.ScanCardWidget.extend({
		osv_name: 'ktv.discount_card',
		domain: function() {
			var input_card_no = this.$('#input_card_no').val();
			return [['card_no', '=', input_card_no]]
		},
   start : function(){
			this._super.apply(this, arguments);
      this.$('#input_card_no').attr('readonly',true);
      this.$el.on('click',_.bind(this._setfocus,this));
      this.on('search_ok',this,this._ok_close);
    },
		post_open: function() {
			this.$('#input_hide').focus();
		},
    _setfocus : function(){
			this.$("#input_hide").focus().select();
    },
	});
	//信用卡卡号录入
	widget.CreditCardInputWidget = widget.ScanCardWidget.extend({
		//重写search方法
		_search: function() {
			var self = this;
			var input_card_no = this.$('#input_card_no').val();
			if (input_card_no != "") {
				self.$(".alert").addClass('hide');
				self.searched_model.set({
					'card_no': input_card_no
				});
			}
			else self.searched_model.clear();
			this.$("#input_card_no").focus().select();
		}
	});
	//抵用券录入
	widget.SalesVoucherInputWidget = widget.ScanCardWidget.extend({
		//重写search 方法
		_search: function() {
			var self = this;
			var input_card_no = this.$('#input_card_no').val();
			if (input_card_no != "") {
				new erp_instance.web.Model('ktv.sales_voucher').get_func('get_active_sales_voucher')(input_card_no).pipe(function(result) {
					//未查到卡信息
					if (!result.id) {
						self.searched_model.clear();
						self.$(".alert").removeClass('hide');
					}
					else {
						self.$(".alert").addClass('hide');
						self.searched_model.set(result);
					}

				});
			}
			else self.searched_model.clear();
			this.$("#input_card_no").focus().select();

		},
		//确认关闭
		_ok_close: function() {
			var id = this.searched_model.get("id");
			if (id) {
				if (!this.model.get(id)) this.model.add(this.searched_model);

				this.close();
			}
		}
	});

  //用户授权界面
  widget.UserAuthorize =  widget.BootstrapModal.extend({
		template: "user-authorize-template",
		init: function(parent, options) {
			this._super(parent, options);
      this.authorize_user = options.authorize_user;
		},
    renderElement : function(){
      this.$el.html(QWeb.render(this.template));
    },
    start : function(){
      this.$el.on('click','.btn-ok',_.bind(this._validate,this));
      this.$el.on('click','.btn-cancel',_.bind(this.close,this));
    },
    post_open : function(){
      this.$('.input-username').focus().select();
    },
    //验证用户
    _validate : function(){
      var self = this;
      var username = self.$('.input-username').val();
      var password = self.$('.input-password').val();
      if(_.isEmpty(username) || _.isEmpty(password))
        {
          self.$('.input-username').focus().select();
          self.$('.input-password').val('');
          return;
        }

      return new erp_instance.web.Model('res.users',{},[['login','=',username],['password','=',password]]).query().all().pipe(function(ret){
        if(ret.length == 0)
        {
          self.$('.alert').removeClass('hide');
          self.$('.input-username').focus().select();
          self.$('.input-password').val('');
        }
        else
        {
          self.authorize_user.set(ret[0]);
          self.close();
        }
      });
    }
  });


	//openerp的入口组件,用于定义系统的初始入口处理
	erp_instance.web.client_actions.add('ktv_room_pos.ui', 'erp_instance.ktv_sale.widget.MainRoomPointOfSale');
	widget.MainRoomPointOfSale = erp_instance.web.Widget.extend({
		template: "RoomPointOfSale",
		init: function() {
			this._super.apply(this, arguments);
			if (erp_instance.ktv_sale.ktv_room_point) throw "ktv_room_point 已初始化.";
			erp_instance.ktv_sale.ktv_room_point = new erp_instance.ktv_sale.model.KtvRoomPoint();
      erp_instance.web.blockUI(); 
		},
		start: function() {
			var self = this;
			return erp_instance.ktv_sale.ktv_room_point.ready.then(function() {
				erp_instance.ktv_sale.ktv_room_point.app = new erp_instance.ktv_sale.App(self.$el);
        erp_instance.webclient.set_content_full_screen(true);

        erp_instance.web.unblockUI();
        self.$('.loader').animate({opacity:0},1500,'swing',function(){self.$('.loader').hide();});

				self.$el.on("click", ".btn-close", _.bind(self.close, self));
			});
		},
		close: function() {
			erp_instance.ktv_sale.ktv_room_point.timer.stop();
			erp_instance.ktv_sale.ktv_room_point = undefined;
      erp_instance.webclient.set_content_full_screen(false);
      this.destroy();
		},
	});
 //客户端打印服务 
	erp_instance.web.client_actions.add('ktv_sale.print_service', 'erp_instance.ktv_sale.widget.PrintService');
	widget.PrintService = erp_instance.web.Widget.extend({
		init: function(parent,options) {
			this._super(parent);
      this.record_id = options['context'].active_id;
      this.osv_name = options['context'].osv_name;
		},
		start: function() {
      var self = this;
      var company,print_context;
      //获取需要打印的数据
			$.when(new erp_instance.web.Model('res.company').get_func('search_read')([]).pipe(function(result) {company = result[0]}),
      new erp_instance.web.Model(self.osv_name).get_func('print_info')(self.record_id,[]).pipe(function(ret){
        print_context = ret;
				ret.context_bill_date = erp_instance.web.str_to_datetime(ret.bill_date).toString('yyyy-MM-dd HH:mm');
      })).then(function(){
        var template_var = {
					"print_context": print_context,
          "company" : company,
          'username' : erp_instance.session.username
				};
				var print_doc = $(QWeb.render(self.osv_name + "-print-template",template_var));
				//处理可见元素
				var print_doc = print_doc.jqprint();
        //FIXME 打印界面处理后,界面会空白,所以返回上一界面
        history.back();
      });
    }
	});
  //日营业额统计
	erp_instance.web.client_actions.add('ktv_sale.daily_report','erp_instance.ktv_sale.widget.DailyReport');
  widget.DailyReport = erp_instance.web.Widget.extend({
		init: function(parent, options) {
			this._super(parent, options);
			this.model = new erp_instance.ktv_sale.model.DailyReport();
      this.ready = $.Deferred();
		},
		renderElement: function() {
      var self = this;
      self.ready.then(function(){
        new erp_instance.web.Model('res.company').get_func('search_read')([]).pipe(function(result) {
          company = result[0];
        }).then(function(){
          var template_var = {
            "report": self.model.toJSON(),
            "company" : company,
            'username' : erp_instance.session.username
          };

          self.$el.html(QWeb.render('daily-report-template',template_var));
          self.$('.start_datetime,.end_datetime').datetimepicker({dateFormat : 'yy-mm-dd' ,timeFormat : 'hh:mm:ss'});
          self.$('.start_datetime,.end_datetime').datetimepicker({dateFormat : 'yy-mm-dd' ,timeFormat : 'hh:mm:ss'});
          self.$('.start_datetime').val(self.model.get('context_start_datetime'));
          self.$('.end_datetime').val(self.model.get('context_end_datetime'));

        });
      });
      return this;
		},
		start: function() {
      var self = this;
      self.$el.on('click','.btn-query',_.bind(this._call_rpc,this));
      self.$el.on('click','.btn-print',_.bind(this._print,this));
      self._call_rpc();
    },
    _call_rpc : function(){
      var self = this;
      var context_start_datetime = Date.parse(self.$('.start_datetime').val());
      var context_end_datetime = Date.parse(self.$('.end_datetime').val());
			var utc_start_datetime = erp_instance.web.datetime_to_str(context_start_datetime);
			var utc_end_datetime = erp_instance.web.datetime_to_str(context_end_datetime);
	
      return new erp_instance.web.Model('ktv.room_operate').get_func('daily_report')(utc_start_datetime,utc_end_datetime).pipe(function(ret){
        self.model.set(ret);
        self.ready.resolve();
      }).then(function(){
        self._refresh();
      });
    },
    _refresh : function() {
      var self = this;
      this.renderElement();
    },
    _print : function(){
      var self = this;
      var company;
			new erp_instance.web.Model('res.company').get_func('search_read')([]).pipe(function(result) {
        company = result[0];
      }).then(function(){
          var template_var = {
            "report": self.model.toJSON(),
            "company" : company,
            'username' : erp_instance.session.username
        };
        var print_doc = $(QWeb.render("daily-report-print-template",template_var));
        //处理可见元素
        var print_doc = print_doc.jqprint();
      });
    }
  });

  //预定清单,处理包厢预定
  widget.RoomScheduledListWidget = erp_instance.web.Widget.extend({
		template_fct: qweb_template("room-scheduled-list-template"),
    model : new model.RoomScheduledList(),
    init : function(parent,options){
      this._super(parent,options);
      this.ready = $.Deferred();
      this.model.on('reset',this.renderElement,this);
      this._fetch();
    },
    renderElement : function() {
      var self = this;
      self.ready.then(function(){
        self.$el.html(self.template_fct({scheduled_list : self.model.toJSON()}));
      });
    },
    start : function(){
      var self = this;
			$('#room_status').hide();
			$('#room_filter').hide();
			$('#room_list').hide();
      //撤定操作
      this.$el.on('click','.btn-cancel-room-scheduled',_.bind(this._cancel_room_scheduled,this));
      //选定预定信息
      this.$el.on('click','.room-scheduled-row',_.bind(this._onclick_scheduled_row,this));
      //预定转开房
      this.$el.on('click','.btn-room-opens',_.bind(this._action_room_opens,this));
      //预定转买钟
      this.$el.on('click','.btn-room-checkout-buytime',_.bind(this._action_room_checkout_buytime,this));
      //预定转买断
      this.$el.on('click','.btn-room-checkout-buyout',_.bind(this._action_room_checkout_buyout,this));
      this.$el.on('click','.btn-close-room-scheduled-list',_.bind(this.close,this));
    },
    //撤定操作
    _cancel_room_scheduled : function(){
      var self = this;
      if(!self.cur_room_scheduled)
      {
        self.$('.alert-operate p').html('请选择要操作的预定信息!');
        return;
      }
			var success_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-success",
					'info': "撤销预定信息成功!"
				});
				self.close();
			};
			var fail_func = function() {
				erp_instance.ktv_sale.ktv_room_point.app.alert({
					'alert_class': "alert-error",
					'info': "撤销预定信息失败!"
				});

			};
      if(self.cur_room_scheduled)
        return new erp_instance.web.Model('ktv.room_scheduled').call('cancel',[this.cur_room_scheduled.get('id')]).pipe(function(result){
          //更新room状态
          erp_instance.ktv_sale.ktv_room_point.fetch_room(result['room'].id);
          self._fetch();
        }).then(success_func,fail_func);
    },
    //预定转正常开房
    _action_room_opens : function(){
      var self = this;
      if(!self.cur_room_scheduled)
      {
        self.$('.alert-operate p').html('请选择要操作的预定信息!');
        return;
      }
	
      var r = new widget.RoomOpensWidget(null, {
				room: erp_instance.ktv_sale.ktv_room_point.get_room_by_id(self.cur_room_scheduled.get('room_id')[0]),
        room_scheduled : self.cur_room_scheduled
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
      self.close();
    },
    //预定转买钟
    _action_room_checkout_buytime : function(){
      var self = this;
      if(!self.cur_room_scheduled)
      {
        self.$('.alert-operate p').html('请选择要操作的预定信息!');
        return;
      }
	
      var r = new widget.RoomCheckoutBuytimeWidget(null, {
				room: erp_instance.ktv_sale.ktv_room_point.get_room_by_id(self.cur_room_scheduled.get('room_id')[0]),
        room_scheduled : self.cur_room_scheduled
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
      self.close();
    },
    //预定转买断
    _action_room_checkout_buyout : function(){
      var self = this;
      if(!self.cur_room_scheduled)
      {
        self.$('.alert-operate p').html('请选择要操作的预定信息!');
        return;
      }
	
      var r = new widget.RoomCheckoutBuyoutWidget(null, {
				room: erp_instance.ktv_sale.ktv_room_point.get_room_by_id(self.cur_room_scheduled.get('room_id')[0]),
        room_scheduled : self.cur_room_scheduled
			});
			r.ready.then(function() {
				$('#operate_area').html(r.$el);
				r.renderElement();
				r.start();
			});
      self.close();
    },
    _onclick_scheduled_row : function(evt){
      var self = this;
      var el_tr = $(evt.currentTarget);
      var room_scheduled_id = parseInt(el_tr.data('room-scheduled-id'));
      self.cur_room_scheduled = self.model.get(room_scheduled_id);
      //显示预定详细信息
      var cur_room_scheduled_form = $(QWeb.render("room-scheduled-show-template",{
        model : self.cur_room_scheduled.toJSON()
      }));
      self.$('.room-scheduled-form-placeholder').html(cur_room_scheduled_form);
    },

		close: function() {
			$('#room_status').show();
			$('#room_filter').show();
			$('#room_list').show();
			this.destroy();
		},

    //自服务端获取包厢预定数据
    _fetch : function(){
      var self = this;
      return new erp_instance.web.Model('ktv.room_scheduled',{},[['state','=','scheduled']]).query().all().pipe(function(ret){
        self.model.reset(ret);
        if(self.model.length > 0)
          self.cur_room_scheduled = self.model.at[0];

        if(!self.isResolved)
          self.ready.resolve();
      });
    }
  });
};
