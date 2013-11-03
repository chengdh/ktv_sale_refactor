# -*- coding: utf-8 -*-
#收银员结账交款清单
from osv import fields, osv
import decimal_precision as dp
from datetime import datetime
import ktv_helper

class  casher_shift_report(osv.osv):
  '''
  收银员结账清单
  '''
  _name = "ktv.casher_shift_report"

  _description = "收银员结账清单"

  #按照结束时间倒序排列
  _order = "end_datetime DESC"

  def _compute_sum(self,cr,uid,ids,field_name,arg,context):
    '''
    计算费用合计信息
    '''
    ret = {}
    for r in self.browse(cr,uid,ids,context):
      ret[r.id] = {
        #合计开台数 = 前班开台数 + 本班开台数
        'sum_open_count' :  r.previous_open_count + r.current_open_count,
        #合计关台数
        'sum_close_count' : r.previous_close_count + r.current_close_count,
        #合计未关台数
        'sum_not_close_count' : r.previous_not_close_count + r.current_not_close_count,
        #合计账单数
        'sum_bills_count' : r.previous_bills_count + r.current_bills_count,
        #实收
        'sum_fee' : r.cash_fee + r.member_card_fee + r.check_fee + r.credit_card_fee + r.sales_voucher_fee,
      }

    return ret
     
  _columns = {
      'shift_name' : fields.char('shift_name',size = 30,help="班次名称"),
      'print_datetime' : fields.datetime('print_datetime',readonly = True,required = True,help="打印时间"),
      'start_datetime' : fields.datetime('start_datetime',readonly = True,required = True,help="结算起始时间"),
      'end_datetime' : fields.datetime('end_datetime',readonly = True,required = True,help="结算结束时间"),
      'shifter_id' : fields.many2one('res.users','shifter_id',help="收银员"),
      #交班费用结算息
      "cash_fee" : fields.float("cash_fee",digits_compute = dp.get_precision('ktv_fee'),help="现金"),
      "member_card_fee" : fields.float("member_card_fee",digits_compute = dp.get_precision('ktv_fee'),help="会员卡"),
      "check_fee" : fields.float("check_fee",digits_compute = dp.get_precision('ktv_fee'),help="支票"),
      "credit_card_fee" : fields.float("credit_card_fee",digits_compute = dp.get_precision('ktv_fee'),help="信用卡"),
      "store_card_fee" : fields.float("store_card_fee",digits_compute = dp.get_precision('ktv_fee'),help="储值卡"),
      "free_fee" : fields.float("free_fee",digits_compute = dp.get_precision('ktv_fee'),help="免单"),
      "on_credit_fee" : fields.float("on_credit_fee",digits_compute = dp.get_precision('ktv_fee'),help="挂账"),
      "sales_voucher_fee" : fields.float("sales_voucher_fee",digits_compute = dp.get_precision('ktv_fee'),help="抵用券"),
      "on_credit_fee" : fields.float("on_credit_fee",digits_compute = dp.get_precision('ktv_fee'),help="挂账"),
      "sum_fee" : fields.function(_compute_sum,multi = 'cal_sum' ,digits_compute = dp.get_precision('ktv_fee'),help="合计费用"),
      #交班信息
      #前班开且未关台
      'previous_open_count' : fields.integer('previous_open_count',help="前班开台且未关台数量"),
      #前班开本班关
      'previous_close_count' : fields.integer('previous_close_count',help="前班开台当班关台数量"),
      #前班开本班未关
      'previous_not_close_count' : fields.integer('previous_not_close_count',help="前班开台且当班未关台数量"),
      #前班账单数量和(指前班在本班结账单)
      'previous_bills_count' : fields.integer('previous_bills_count',help="前班账单总数"),

      #本班开台数量
      'current_open_count' : fields.integer('current_open_count',help="当班开台数量"),
      #本班关台数
      'current_close_count' : fields.integer('previous_open_count',help="当班开当班关数量"),
      #本班开且未关
      'current_not_close_count' : fields.integer('current_not_close_count',help="当班开台未关数量"),
      #本班账单数(本班预售账单 + 本班结账账单)
      'current_bills_count' : fields.integer('current_bills_count',help="当班帐单总数"),

      #合计开台数 = 前班开台数 + 本班开台数
      'sum_open_count' :  fields.function(_compute_sum,type='integer',multi='cal_sum',string='sum_open_count',help="合计开台总数"),

      #合计关台数
      'sum_close_count' : fields.function(_compute_sum,type='integer',multi='cal_sum',string='sum_close_count',help="合计关台总数"),

      #合计未关台数
      'sum_not_close_count' : fields.function(_compute_sum,type='integer',multi='cal_sum',string='sum_not_close_count',help="合计未关台总数"),
      #合计账单数
      'sum_bills_count' : fields.function(_compute_sum,type='integer',multi='cal_sum',string='sum_bills_count',help="合计帐单总数"),
      #会员卡销售数量
      'member_card_count' : fields.integer('member_card_count',help="会员卡销售总数"),
      #会员卡销售金额
      'new_member_card_fee' : fields.float('new_member_card_fee',digits_compute = dp.get_precision('ktv_fee'),help="会员卡销售总数"),
      #会员卡充值金额
      'member_charge_fee' : fields.integer('member_charge_fee',digits_compute = dp.get_precision('ktv_fee'),help="会员卡充值金额"),
      #交接相关room_operate ids
      'room_operate_ids' : fields.one2many('ktv.room_operate','casher_shift_report_id',help="本次交接关联的roop_operate 对象")
  }

  _defaults = {
      'print_datetime' : fields.datetime.now,
      'shifter_id' : lambda obj,cr,uid,ctx: uid
      }

  def get_shift_report(self,cr,uid,context=None):
    '''
    计算收银员交接单
    如果收银员未进行交班操作,则生成交班信息,如果收银员已进行交班操作,则查询交班信息
    如果未到交班时刻,则只能查看信息,不能进行交班操作
    #FIXME 当班结束30分钟内可交班
    '''
    pool = self.pool
    ret = {}

    #获取前一班次
    pre_work_shift = pool.get('ktv.work_shifts_config').get_previous_work_shift(cr,uid,datetime.now())
    if not pre_work_shift:
      raise osv.except_osv(_("错误"), _('找不到班次设置信息.'))

    #判断是否存在交接单
    start_datetime = pre_work_shift['start_datetime']
    end_datetime = pre_work_shift['end_datetime']
    str_start_datetime = ktv_helper.strftime(start_datetime)
    str_end_datetime = ktv_helper.strftime(end_datetime)
    rpt_ids = self.search(cr,uid,[('start_datetime','=',str_start_datetime), \
        ('end_datetime','=',str_end_datetime)])
    if rpt_ids:
      ret = self.read(cr,uid,rpt_ids[0])
    else:
      ret = pool.get('ktv.room_operate').calculate_casher_shift_report(cr,uid,start_datetime,end_datetime)
      ret_member = pool.get('ktv.member').calculate_casher_shift_report(cr,uid,start_datetime,end_datetime)
      ret.update(ret_member)
      ret['start_datetime'] = str_start_datetime
      ret['end_datetime'] = str_end_datetime
      ret['shift_name'] = pre_work_shift['name']
      ret['print_datetime'] = ktv_helper.strftime(datetime.now())
    return ret

  def confirm(self,cr,uid,vals):
    '''
    交班确认
    '''
    pool = self.pool
    id = self.create(cr,uid,vals)
    ret = self.read(cr,uid,id)
    return ret
    
