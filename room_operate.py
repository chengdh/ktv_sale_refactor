# -*- coding: utf-8 -*- 
import logging 
from osv import osv,fields 
from room import room
import ktv_helper
import decimal_precision as dp

_logger = logging.getLogger(__name__)
class room_operate(osv.osv):
    '''
    包厢操作类:
    以下操作都属于包厢操作：
    1 预定
    2 正常开房
    3 买钟
    4 买断
    5 续钟
    6 退钟
    7 换房
    8 并房
    包厢通过cur_room_operate_id与room_operate相关联,用于标示当前包厢所对应的操作
    room_operate与以上各个操作是one2many的关系,这样通过一个room_operate可以获取所有包厢在开房过程中所进行的操作,结账时遍历所有的操作并进行计算即可
    '''
    _name = "ktv.room_operate"
    #由于在其他地方需要引用该对象,所有将name定义为bill_no
    _rec_name = "bill_no"

    _description = "包厢操作类,与包厢是many2one的关系"

    def _compute_fields(self,cr,uid,ids,name,args,context = None):
        """
        计算以下字段的值:
        open_time 以room_opens或room_checkout_buytime或room_checkout_buytime中的open_time为准
        close_time 以最后一次结算时间为准
        consume_minutes
        changed_room_minutes
        """
        ret = {}
        for record in self.browse(cr,uid,ids):
            #依次判断所有开房相关操作:room_opens > room_checkout_buyout > room_checkout_buytime
            which_room_open_ops = record.room_opens_ids or record.room_checkout_buyout_ids or record.room_checkout_buytime_ids

            last_room = which_room_open_ops[0].room_id if which_room_open_ops else None
            fee_type_id = which_room_open_ops[0].fee_type_id.id if which_room_open_ops else None
            price_class_id = which_room_open_ops[0].price_class_id.id if which_room_open_ops else None
            open_time = which_room_open_ops[0].open_time if which_room_open_ops else None
            guest_name = which_room_open_ops[0].guest_name if which_room_open_ops else None
            persons_count = which_room_open_ops[0].persons_count if which_room_open_ops else None
            prepay_fee = which_room_open_ops[0].prepay_fee if which_room_open_ops else None


            #判断是否预售操作presale
            is_presale = True if record.room_checkout_buyout_ids or record.room_checkout_buytime_ids else False
            #是否已结账
            is_shift_reported = True if record.casher_shift_report_id else False

            #依次判断关房操作,也有可能当前包厢尚未关闭,close_time可能为空
            #room_change > room_checkout > room_change_checkout_buytime > room_change_checkout_buyout > room_checkout_buytime
            which_room_close_ops = record.room_checkout_ids or record.room_change_ids or \
                    record.room_change_checkout_buyout_ids or record.room_checkout_buyout_ids or \
                    record.room_checkout_buytime_refund_ids or record.room_checkout_buytime_continue_ids or \
                    record.room_change_checkout_buytime_ids or record.room_checkout_buytime_ids
            close_time = None
            last_member = None
            last_buyout_config = None
            last_cron = None
            if which_room_close_ops:
              close_time = which_room_close_ops[0].close_time

              #获取最后一次操作的member_id
              last_member =getattr(which_room_close_ops[-1],'member_id',None)
              last_buyout_config = getattr(which_room_close_ops[-1],'buyout_config_id',None)
              #最后一次cron任务
              last_cron = getattr(which_room_close_ops[-1],'cron_id',None)
              #获取last_room_id
              last_room =  getattr(which_room_close_ops[-1],'room_id',None)


            if not last_buyout_config:
              #最后买断id
              last_buyout_config = getattr(which_room_open_ops[0],'buyout_config_id',None) if which_room_open_ops else None



            last_buyout_config_id = getattr(last_buyout_config,'id',None)
            last_cron_id = getattr(last_cron,'id',None)
            last_room_id = getattr(last_room,'id',None)

            if not last_member:
              last_member = which_room_open_ops[0].member_id if which_room_open_ops else None


            last_member_id = getattr(last_member,'id',None)

            consume_minutes = 0
            if open_time:
                consume_minutes = ktv_helper.str_timedelta_minutes(open_time,close_time if close_time else ktv_helper.utc_now_str())
            #到钟报警
            alert = False
            #计算已消费时长和剩余消费时长
            left_minutes = 0
            #如果当前时间>close_time 则该包厢已关闭
            #如果当前时间<=close_time 则该包厢尚未关闭
            if close_time:
              if ktv_helper.utc_now_str() > close_time:
                left_minutes = 0
              else:
                left_minutes = ktv_helper.str_timedelta_minutes(ktv_helper.utc_now_str(),close_time)
                if left_minutes <= 5:
                  alert = True


            #计算consume_minutes
            ori_consume_minutes = changed_room_minutes = total_minutes = present_minutes = song_ticket_minutes =  0

            total_fee = room_fee = hourly_fee = changed_room_fee = changed_room_hourly_fee = guest_damage_fee = total_discount_fee = total_after_discount_fee = total_after_discount_cash_fee = 0.0
            on_credit_fee = member_card_fee = credit_card_fee = sales_voucher_fee =  free_fee =  0.0

            for r_ops in (record.room_checkout_ids,record.room_checkout_buyout_ids,record.room_checkout_buytime_ids,record.room_change_checkout_buyout_ids,record.room_change_checkout_buytime_ids,record.room_checkout_buytime_continue_ids):
              for r_op in r_ops:
                present_minutes += r_op.present_minutes
                changed_room_minutes += r_op.changed_room_minutes
                ori_consume_minutes += r_op.consume_minutes
                song_ticket_minutes += r_op.song_ticket_minutes
                room_fee += r_op.room_fee
                hourly_fee += r_op.hourly_fee
                changed_room_fee += r_op.changed_room_fee
                changed_room_hourly_fee += r_op.changed_room_hourly_fee
                guest_damage_fee += r_op.guest_damage_fee

                member_card_fee += r_op.member_card_fee
                credit_card_fee += r_op.credit_card_fee
                on_credit_fee += r_op.on_credit_fee
                sales_voucher_fee += r_op.sales_voucher_fee
                free_fee += r_op.free_fee
                total_fee += r_op.total_fee
                total_discount_fee += r_op.total_discount_fee
                total_after_discount_fee += r_op.total_after_discount_fee
                total_after_discount_cash_fee += r_op.total_after_discount_cash_fee
                total_minutes += r_op.consume_minutes  + r_op.changed_room_minutes

            ret[record.id] = {
                'guest_name' : guest_name,
                'persons_count' : persons_count or 1,
                'fee_type_id' : fee_type_id,
                'price_class_id' : price_class_id,
                'last_cron_id' : last_cron_id,
                'last_room_id' : last_room_id,
                'last_member_id' : last_member_id,
                'last_buyout_config_id' : last_buyout_config_id,
                'open_time' : open_time,
                'close_time' : close_time,
                'prepay_fee' : prepay_fee or 0.0,
                'ori_consume_minutes' : ori_consume_minutes or 0,
                'consume_minutes' : consume_minutes or 0,
                'left_minutes' : left_minutes or 0,
                'alert' : alert,
                'present_minutes' : present_minutes or 0,
                'total_minutes' : total_minutes or 0,
                'room_fee' : room_fee or 0.0,
                'hourly_fee' : hourly_fee or 0.0,
                'changed_room_fee' : changed_room_fee or 0.0,
                'changed_room_hourly_fee' : changed_room_hourly_fee or 0.0,
                'changed_room_minutes' : changed_room_minutes or 0,
                'guest_damage_fee' : guest_damage_fee or 0.0,
                'member_card_fee' : member_card_fee or 0.0,
                'credit_card_fee' : credit_card_fee or 0.0,
                'sales_voucher_fee' : sales_voucher_fee or 0.0,
                'on_credit_fee' : on_credit_fee or 0.0,
                'free_fee' : free_fee or 0.0,

                'song_ticket_minutes' : song_ticket_minutes or 0,
                'total_fee' : total_fee or 0.0,
                'total_discount_fee' : total_discount_fee or 0.0,
                'total_after_discount_fee' : total_after_discount_fee or 0.0,
                'total_after_discount_cash_fee' : total_after_discount_cash_fee or 0.0,
                'is_shift_reported' : is_shift_reported,
                'is_presale'        : is_presale,
                }

        _logger.debug("ret = %s" % ret)
        return ret


    def _get_room_operate_for_compute(self,cr,uid,ids,osv_name,context={}):
        '''
        从相关对象中获取要更新的room_operate对象id
        :return list
        '''
        res = {}
        for r in self.pool.get(osv_name).browse(cr,uid,ids):
            r_op = getattr(r,'room_operate_id',None)
            if r_op:
                res[r_op.id] = True

        return res.keys()


    def _get_room_operate_from_room_opens(self,cr,uid,ids,context={}):
        '''
        从room_opens操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_opens',context)

    def _get_room_operate_from_buytime(self,cr,uid,ids,context={}):
        '''
        从room_checkout_buytimes操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout_buytime',context)

    def _get_room_operate_from_buyout(self,cr,uid,ids,context={}):
        '''
        从room_checkout_buyout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout_buyout',context)

    def _get_room_operate_from_room_checkout(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout',context)

    def _get_room_operate_from_room_change(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_change',context)

    def _get_room_operate_from_room_change_checkout_buyout(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_change_checkout_buyout',context)

    def _get_room_operate_from_room_change_checkout_buytime(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_change_checkout_buytime',context)

    def _get_room_operate_from_room_checkout_buytime_continue(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout_buytime_continue',context)

    def _get_room_operate_from_room_checkout_buyout_continue(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout_buyout_continue',context)

    def _get_room_operate_from_room_checkout_buytime_refund(self,cr,uid,ids,context={}):
        '''
        从room_checkout操作中获取要更新的room_operate对象的id
        '''
        return self.pool.get('ktv.room_operate')._get_room_operate_for_compute(cr,uid,ids,'ktv.room_checkout_buytime_refund',context)

    def _compute_open_and_close_time(self,cr,uid,ids,name,args,context ={}):
        '''
        计算room_operate的close_time 和 opentime
        '''
        res = {}
        for record in self.browse(cr,uid,ids):
            #依次判断所有开房相关操作:room_opens > room_checkout_buyout > room_checkout_buytime
            which_room_open_ops = record.room_opens_ids or record.room_checkout_buyout_ids or record.room_checkout_buytime_ids
            open_time = which_room_open_ops[0].open_time if which_room_open_ops else None
            which_room_close_ops = record.room_checkout_ids or record.room_change_ids or \
                    record.room_change_checkout_buyout_ids or record.room_checkout_buyout_ids or \
                    record.room_checkout_buytime_refund_ids or record.room_checkout_buytime_continue_ids or \
                    record.room_change_checkout_buytime_ids or record.room_checkout_buytime_ids
            close_time = None
            if which_room_close_ops:
              close_time = which_room_close_ops[0].close_time

            res[record.id] = {
                    'open_time'  : open_time,
                    'close_time' :  close_time,
                    }

        return res

    _columns = {
        "operate_date" : fields.datetime('operate_datetime',required = True,help='操作时间'),
        "bill_no" : fields.char("bill_no",size = 64,required = True,help = "账单号"),
        "room_scheduled_ids" : fields.one2many("ktv.room_scheduled","room_operate_id",help="预定信息列表"),
        "room_opens_ids" : fields.one2many("ktv.room_opens","room_operate_id",help="开房信息列表"),
        "room_change_ids" : fields.one2many("ktv.room_change","room_operate_id",help="换房信息列表"),
        "room_checkout_ids" : fields.one2many("ktv.room_checkout","room_operate_id",help="包厢结账信息列表"),
        "room_checkout_buyout_ids" : fields.one2many("ktv.room_checkout_buyout","room_operate_id",help="包厢买断结账信息列表"),
        "room_checkout_buytime_ids" : fields.one2many("ktv.room_checkout_buytime","room_operate_id",help="包厢买钟结账信息列表"),
        "room_change_checkout_buytime_ids" : fields.one2many("ktv.room_change_checkout_buytime","room_operate_id",help="买钟-换房结账信息列表"),
        "room_checkout_buytime_continue_ids" : fields.one2many("ktv.room_checkout_buytime_continue","room_operate_id",help="续钟列表"),
        "room_checkout_buytime_refund_ids" : fields.one2many("ktv.room_checkout_buytime_refund","room_operate_id",help="退钟列表"),
        "room_change_checkout_buyout_ids" : fields.one2many("ktv.room_change_checkout_buyout","room_operate_id",help="买断-换房结账信息列表"),

        #以下为计算字段列表,NOTE 字段名称与room_checkout中的完全一致
        #基础信息

        "fee_type_id" : fields.function(_compute_fields,type='many2one',obj="ktv.fee_type",multi='compute_fields',string='计费方式'),
        "price_class_id" : fields.function(_compute_fields,type='many2one',obj="ktv.price_class",multi='compute_fields',string='价格类型(可能为None)'),
        "last_member_id" : fields.function(_compute_fields,type='many2one',obj="ktv.member",multi='compute_fields',string='会员id',help="最近一次使用的会员卡"),
        "last_buyout_config_id" : fields.function(_compute_fields,type='many2one',obj="ktv.buyout_config",multi='compute_fields',string='最近买断id',help="获取当前操作的最后一次买断id"),
        "last_room_id" : fields.function(_compute_fields,type='many2one',obj="ktv.room",multi='compute_fields',string='包厢id',help="获取当前操作的最后一次包厢id"),
        "last_cron_id" : fields.function(_compute_fields,type='many2one',obj="ir.cron",multi='compute_fields',string='最近cron任务id',help="最近cron任务id,主要是处理到点关房处理,预售时可能为空"),
        "guest_name" : fields.function(_compute_fields,type='string',multi='compute_fields',string='客人姓名'),
        "persons_count": fields.function(_compute_fields,type='integer',multi='compute_fields',string='客人人数'),
        "open_time" : fields.function(_compute_open_and_close_time,type='datetime',store={
            'ktv.room_opens' : (_get_room_operate_from_room_opens,['open_time','room_operate_id'],10),
            'ktv.room_checkout_buyout' : (_get_room_operate_from_buyout,['open_time','room_operate_id'],10),
            'ktv.room_checkout_buytime' : (_get_room_operate_from_buytime,['open_time','room_operate_id'],10),
            },
            multi = 'comput_time',
            string="开房时间"),

        "close_time" : fields.function(_compute_open_and_close_time,type='datetime',store = {
            'ktv.room_checkout' : (_get_room_operate_from_room_checkout,['close_time','room_operate_id'],10),
            'ktv.room_change' : (_get_room_operate_from_room_change,['close_time','room_operate_id'],10),
            'ktv.room_checkout_buytime' : (_get_room_operate_from_buytime,['close_time','room_operate_id'],10),
            'ktv.room_checkout_buyout' : (_get_room_operate_from_buyout,['close_time','room_operate_id'],10),
            'ktv.room_change_checkout_buytime' : (_get_room_operate_from_buytime,['close_time','room_operate_id'],10),
            'ktv.room_change_checkout_buyout' : (_get_room_operate_from_room_change_checkout_buyout,['close_time','room_operate_id'],10),
            'ktv.room_checkout_buytime_refund' : (_get_room_operate_from_room_checkout_buytime_refund,['close_time','room_operate_id'],10),
            'ktv.room_checkout_buytime_continue' : (_get_room_operate_from_room_checkout_buytime_continue,['close_time','room_operate_id'],10),
            },
            multi = 'comput_time',
            string="关房时间"),
        #"saved_open_time" : fields.datetime("saved_open_time",readonly = True,help="开房时间,保存到数据库中,便于查询"),
        #"saved_close_time" : fields.datetime("saved_close_time",readonly = True,help='关房时间,保存到数据库中,便于查询'),
 
        "left_minutes" : fields.function(_compute_fields,type='integer',multi="compute_fields",string="剩余消费时间"),
        "alert" : fields.function(_compute_fields,type='boolean',multi="compute_fields",string="到钟时间剩余5分钟时报警"),
        "prepay_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="预付费",digits_compute = dp.get_precision('ktv_fee')),
        "consume_minutes": fields.function(_compute_fields,type='integer',multi="compute_fields",string="消费时长"),
        "ori_consume_minutes": fields.function(_compute_fields,type='integer',multi="compute_fields",string="原消费时长(由于存在换房,所以实际消费时间会变化)"),
        "present_minutes": fields.function(_compute_fields,type='integer',multi="compute_fields",string="赠送时长"),
        "total_minutes" : fields.function(_compute_fields,multi="compute_fields",string="合计消费时长",type='integer'),
        "room_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="包厢费",digits_compute = dp.get_precision('ktv_fee')),
        "hourly_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="钟点费",digits_compute = dp.get_precision('ktv_fee')),
        "changed_room_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="换房包厢费",digits_compute = dp.get_precision('ktv_fee')),
        "changed_room_hourly_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="换房钟点费",digits_compute = dp.get_precision('ktv_fee')),
        "changed_room_minutes": fields.function(_compute_fields,type='integer',multi="compute_fields",string="换房时长"),
        "guest_damage_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="客损费用",digits_compute = dp.get_precision('ktv_fee')),

        #不同支付方式的费用
        "member_card_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="会员卡支付费用",digits_compute = dp.get_precision('ktv_fee')),
        "credit_card_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="信用卡支付费用",digits_compute = dp.get_precision('ktv_fee')),
        "sales_voucher_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="代金券费用",digits_compute = dp.get_precision('ktv_fee')),
        #TODO 抵扣券明细
        #"all_sales_voucher_ids"
        'on_credit_fee': fields.function(_compute_fields,type='float',multi="compute_fields",string="挂账费用",digits_compute = dp.get_precision('ktv_fee')),
        "free_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="免单费用",digits_compute = dp.get_precision('ktv_fee')),

        #欢唱券
        "song_ticket_minutes": fields.function(_compute_fields,type='integer',multi="compute_fields",string="欢唱券抵扣分钟"),
        "total_fee": fields.function(_compute_fields,type='float',multi="compute_fields",string="折前应收费用",digits_compute = dp.get_precision('ktv_fee')),
        "total_discount_fee" : fields.function(_compute_fields,multi = "compute_fields",string="合计折扣费用",digits_compute = dp.get_precision('ktv_fee')),
        "total_after_discount_fee" : fields.function(_compute_fields,multi = "compute_fields",string="合计应付费用(折后费用)",digits_compute = dp.get_precision('ktv_fee')),
        "total_after_discount_cash_fee" : fields.function(_compute_fields,multi="compute_fields",string="合计应收现金房费(折后费用)",digits_compute = dp.get_precision('ktv_fee')),

        "casher_shift_report_id" : fields.many2one('ktv.casher_shift_report','casher_shift_report_id',help='所属收银员结账单id'),
        "is_shift_reported": fields.function(_compute_fields,type='boolean',multi="compute_fields",string="是否已结账"),
        "is_presale": fields.function(_compute_fields,type='boolean',multi="compute_fields",string="是否属于预售"),
        "active" : fields.boolean("active"),
      }

    _defaults = {
        'operate_date' : fields.datetime.now,
        'active' : True,
        'bill_no': lambda obj, cr, uid, context: obj.pool.get('ir.sequence').get(cr, uid, 'ktv.room_operate'),
        'credit_card_fee' : 0.0,
        }

    def calculate_sum_paid_info(self,cr,uid,operate_id,context=None):
        """
        获取该room_operate中所有已支付费用dict
        """
        pool = self.pool
        ret = self.read(cr,uid,operate_id,context=context)
        #使用read方法时,类型为function的one2many字段不返回dict对象,
        if ret['fee_type_id']:
          fee_type = pool.get('ktv.fee_type').read(cr,uid,ret['fee_type_id'],['id','name'])
          ret['fee_type_id'] = (fee_type['id'],fee_type['name'])
        if ret['price_class_id']:
          price_class = pool.get('ktv.price_class').read(cr,uid,ret['price_class_id'],['id','name'])
          ret['price_class_id'] = (price_class['id'],price_class['name'])
        if ret['last_member_id']:
          last_member = pool.get('ktv.member').read(cr,uid,ret['last_member_id'])
          ret['last_member_id'] = (last_member['id'],last_member['member_card_no'],last_member['name'],last_member['balance'])

        if ret['last_buyout_config_id']:
          last_buyout_config = pool.get('ktv.buyout_config').read(cr,uid,ret['last_buyout_config_id'],['id','name'])
          ret['last_buyout_config_id'] = (last_buyout_config['id'],last_buyout_config['name'])
        if ret['last_cron_id']:
          last_cron = pool.get('ir.cron').read(cr,uid,ret['last_cron_id'],['id','name'])
          ret['last_cron_id'] = (last_cron['id'],last_cron['name'])

        return ret

    def process_operate(self,cr,uid,operate_values):
        """
        包厢操作统一入口,调用不同业务类的操作
        这样设计的好处是隔离了变化,如果需要修改服务端的逻辑,客户端的调用逻辑不用做任何修改
        在客户端新增了业务实体调用,只用增加新的实体即可,其他不用做修改
        在js端也需要封装同样的调用接口来隔离变化
        :params room_id integer 包厢编码
        :operate_values 前端传入的业务操作数据
        :operate[osv_name] 要调用的实体业务对象名称,比如ktv.room_checkout
        调用示例:
        开房操作,返回三个参数 1 操作成功的实体对象 2 包厢应修改的状态 3 cron对象,用于处理对包厢的定时操作：
        (operate_obj,room_state,cron) = self.pool.get(operate_values['osv_name']).process_operate(cr,uid,opeate_values)
        更新当前包厢状态,添加cron对象,返回处理结果
        """
        pool = self.pool
        osv_name = operate_values['osv_name']
        room_id = operate_values['room_id']

        #将该room_operate的原cron task设置为无效
        self._disable_last_cron_task(cr,uid,room_id)
        #调用实际的包厢操作类处理
        operate_obj,room_state,cron = pool.get(osv_name).process_operate(cr,uid,operate_values)
        #更新包厢状态
        if room_state:
          pool.get('ktv.room').write(cr,uid,room_id,{'state' : room_state})

        # 添加新cron对象
        if cron:
          new_cron_id = self._create_operate_cron(cr,uid,cron)
          #修改当前操作的cron_id
          pool.get(osv_name).write(cr,uid,operate_obj['id'],{'cron_id' : new_cron_id})

        #room_fields = pool.get('ktv.room').fields_get(cr,uid).keys()
        room = pool.get('ktv.room').search_with_fee_info(cr,uid,[('id','=',room_id)])[0]
       #返回两个对象room和room_operate
        _logger.debug("operate_obj = %s " % operate_obj)

        ret =  {'room' : room,'room_operate' : operate_obj}
        #如果是换房操作,则还需要更新新换包厢的状态
        changed_room_id = operate_values.get('changed_room_id',None)
        if changed_room_id:
          changed_room = pool.get('ktv.room').read(cr,uid,changed_room_id)
          ret['changed_room'] = changed_room

        #如果存在会员卡消费,需要记录会员卡消费记录member_consumption
        member = operate_obj.get('member_id',None)
        member_card_fee = operate_obj.get('member_card_fee',0.0)
        total_after_discount_fee = operate_obj.get('total_after_discount_fee',0.0)
        if member and member_card_fee > 0 and total_after_discount_fee > 0:
            self._create_member_consumption(cr,uid,member[0],member_card_fee,total_after_discount_fee)

        return ret

    def _create_member_consumption(self,cr,uid,member_id,pay_member_card_fee,total_after_discount_fee = 0.0):
        '''
        结账时创建会员卡消费记录
        :param member_id integer 会员卡id
        :param pay_member_card_fee float 会员卡付款金额
        :param total_fee float 合计付款金额 在计算会员积分时使用
        :return 创建成功的member_consumption id
        '''
        id = self.pool.get('ktv.member_consumption').create(cr,uid,{
            'member_id' : member_id,
            'paid_fee' : pay_member_card_fee,
            'total_paid_fee' : total_after_discount_fee,
            })
        return id


    def _disable_last_cron_task(self,cr,uid,room_id):
        """
        将该room_operate的最后一次cron_task设置为无效,由于存在换房及退钟、继续钟情况,所以原cron任务有可能失效
        :param room_id integer
        :rtype None
        """

        rop = self.pool.get('ktv.room').browse(cr,uid,room_id).current_room_operate_id
        last_cron = getattr(rop,'last_cron_id',None)
        last_cron_id = getattr(last_cron,'id',None)
        if last_cron_id:
          _logger.debug('last_cron_id = %d' % last_cron_id)
          self.pool.get('ir.cron').write(cr,uid,[last_cron_id],{'numbercall' : 0,'active' : False})
          _logger.debug('end disable last cron task')

    def _create_operate_cron(self,cr,uid,cron_vals):
        """
        创建cron定时执行任务,在需要定时执行关房任务时,需要执行
        :params dict cron_vals 定时任务相关属性
        """
        return self.pool.get('ir.cron').create(cr,uid,cron_vals)

    def last_room_opens_and_change(self,cr,uid,op_id):
        """
        获取最近一次包厢开房信息和换房信息,只适用于正常开房
        :param op_id integer room_operate id
        :return tuple room_open和room_change对象
        """
        operate_id = self.browse(cr,uid,op_id)
        return (operate_id.room_opens_ids and operate_id.room_opens_ids[0] or None,operate_id.room_change_ids and operate_id.room_change_ids[0] or None )

    def last_two_presale_checkout(self,cr,uid,op_id):
        """
        获取最后2次预售结账信息
        :param op_id room_operate主键
        :rtype tuple  前一次结账信息,最后一次结账信息
        """
        operate = self.browse(cr,uid,op_id)
        #获取所有相关信息,并按照bill_date进行排列
        all_checkout_list = list()
        for c_list in (operate.room_checkout_buyout_ids,operate.room_checkout_buytime_ids, \
            operate.room_change_checkout_buyout_ids,operate.room_change_checkout_buytime_ids, \
            operate.room_checkout_buytime_continue_ids,operate.room_checkout_buytime_refund_ids):
            all_checkout_list.extend(c_list)

        #排序操作
        def cmp_checkout(c1,c2):
            """
            比较两个结算信息的创建时间
            :param c1 c2 要比较的结算信息
            :rtype integer -1:c1 < c2 0:c1 = c2 1: c1 > c2  
            """
            if c1.bill_datetime < c2.bill_datetime:
                return -1

            if c1.bill_datetime == c2.bill_datetime:
                return 0

            if c1.bill_datetime > c2.bill_datetime:
                return 1

        all_checkout_list.sort(cmp = cmp_checkout,reverse = True)

        pool = self.pool
        p = l = None

        if len(all_checkout_list) >= 2:
            p = all_checkout_list[1];l = all_checkout_list[0]
        elif room_change_checkout_ids:
            p = l = all_checkout_list[0]
        else:
            raise osv.except_osv(_("错误"), _('包厢结账信息不存在.'))
      
        ret_p = pool.get(getattr(p,'_name')).read(cr,uid,p.id)
        ret_p['osv_name'] = getattr(p,'_name')
        ret_l = pool.get(getattr(l,'_name')).read(cr,uid,l.id)
        ret_l['osv_name'] = getattr(l,'_name')
        ret = (ret_p,ret_l)
        _logger.debug("last two checkout = %s" % repr(ret))
        return ret

    def update_previous_checkout_for_presale_room_change(self,cr,uid,op_id):
        """
        修改上次结账信息的关房时间和消费时间,在预售换房时使用
        :param op_id integer 
        :rtype dict 更新的checkout
        """
        #修改关联的最后一次结账信息中的关闭时间和消费时长
        pool = self.pool
        p_checkout,l_checkout = self.last_two_presale_checkout(cr,uid,op_id)
        close_time = ktv_helper.utc_now_str()
        consume_minutes = ktv_helper.str_timedelta_minutes(p_checkout['open_time'],close_time)
        osv_name = p_checkout['osv_name']
        update_attrs = {"close_time" : close_time}
        if 'room_change' in osv_name:
            update_attrs['changed_room_minutes'] = consume_minutes
        else:
            update_attrs['consume_minutes'] = consume_minutes
        if p_checkout:
            pool.get(osv_name).write(cr,uid,p_checkout['id'],update_attrs)

        return p_checkout and pool.get(osv_name).read(cr,uid,p_checkout['id'])

    def calculate_casher_shift_report(self,cr,uid,start_datetime,end_datetime):
        '''
        计算给定时间段的包厢费用信息,在casher_shift_report中调用
        :param pre_start_datetime datetime 前班起始时间
        :param pre_end_datetime datetime 前班起始时间
        :param start_datetime datetime 当班计算起始时间
        :param end_datetime datetime 当班计算结束时间
        :return dict 包厢费用信息
        '''
        pool = self.pool
        #关联的room_operate_ids
        room_operate_ids = []
        #计算上个班次的起始时间
        prev_shift = pool.get('ktv.work_shifts_config').get_previous_work_shift(cr,uid,start_datetime)
        str_pre_start_datetime = ktv_helper.strftime(prev_shift['start_datetime'])
        str_pre_end_datetime = ktv_helper.strftime(prev_shift['end_datetime'])
        str_start_datetime = ktv_helper.strftime(start_datetime)
        str_end_datetime = ktv_helper.strftime(end_datetime)
        
        #现金/支票/会员卡/信用卡/储值卡/免单/挂账/抵用券
        cash_fee = check_fee =  member_card_fee = credit_card_fee = store_card_fee = free_fee = on_credit_fee = sales_voucher_fee = 0.0

        #前班开台未关(不包括预售)
        pre_not_close = []
        #前班开台未关(预售)
        pre_presale_not_close = []
        #前班开台本班关台(不包括预售)
        pre_close_on_current = []
        #前班开本班关(预售)
        pre_presale_close_on_current = []
        #前班开台本班未关(不包括预售)
        pre_not_close_on_current = []
        #前班开台本班未关(预售)
        pre_presale_not_close_on_current = []
 
        #前班开台信息
        previous_open_ids =  self.search(cr,uid,[('operate_date','>=',str_pre_start_datetime),('operate_date','<=',str_pre_end_datetime)])

        #先计算前班开台信息 
        for op in self.browse(cr,uid,previous_open_ids):
            close_time = getattr(op,'close_time',None)
            is_presale = getattr(op,'is_presale',False)
            if not close_time or (close_time and close_time > str_pre_end_datetime):
                if is_presale:
                    pre_presale_not_close.append(op)
                else:
                    pre_not_close.append(op)

            if close_time and close_time > str_pre_end_datetime and close_time >= str_start_datetime and close_time <= str_end_datetime:
                room_operate_ids.append(op.id)
                if is_presale:
                    pre_presale_close_on_current.append(op)
                else:
                    pre_close_on_current.append(op)

            if not close_time or (close_time and close_time > str_end_datetime):
                if is_presale:
                    pre_presale_not_close_on_current.append(op)
                else:
                    pre_not_close_on_current.append(op)


        #当班开台(不包括预售)
        current_open = []
        #当班开台(预售)
        current_presale_open = []
        #当班关台(不包括预售)
        current_close = []
        #当班关台(预售)
        current_presale_close = []
        #当班未关(不包括预售)
        current_not_close = []
        #当班未关(预售)
        current_presale_not_close = []
        #当班的开台记录
        current_open_ids = self.search(cr,uid,[('operate_date','>=',str_start_datetime),('operate_date','<=',str_end_datetime)])
 
        #先计算当班开台信息 
        for op in self.browse(cr,uid,current_open_ids):
            close_time = getattr(op,'close_time',None)
            is_presale = getattr(op,'is_presale',False)
            if is_presale:
                current_presale_open.append(op)
            else:
                current_open.append(op)

            if close_time and close_time <= str_end_datetime:
                #room_operate只记录在当班结账信息
                room_operate_ids.append(op.id)
                if is_presale:
                    current_presale_close.append(op)
                else:
                    current_close.append(op)

            if not close_time or (close_time and close_time > str_end_datetime):
                if is_presale:
                    current_presale_not_close.append(op)
                else:
                    current_not_close.append(op)

            #计算费用信息,应计算以下费用 前班开本班关(不含预售) + 本班开本班关(普通+预售) + 本班开且未关(预售)
        for op in (pre_close_on_current + current_close + current_presale_close + current_presale_not_close): 
            cash_fee += op.total_after_discount_cash_fee
            member_card_fee += op.member_card_fee
            credit_card_fee += op.credit_card_fee
            free_fee += op.free_fee
            on_credit_fee += op.on_credit_fee
            sales_voucher_fee += sales_voucher_fee

        #计算台数信息
        '''
        #前班开台未关(不包括预售)
        pre_not_close = []
        #前班开台未关(预售)
        pre_presale_not_close = []
        #前班开台本班关台(不包括预售)
        pre_close_on_current = []
        #前班开本班关(预售)
        pre_presale_close_on_current = []
        #前班开台本班未关(不包括预售)
        pre_not_close_on_current = []
        #前班开台本班未关(预售)
        pre_presale_not_close_on_current = []

        #当班开台(不包括预售)
        current_open = []
        #当班开台(预售)
        current_presale_open = []
        #当班关台(不包括预售)
        current_close = []
        #当班关台(预售)
        current_presale_close = []
        #当班未关(不包括预售)
        current_not_close = []
        #当班未关(预售)
        current_presale_not_close = []
        '''
 
        previous_open_count = previous_close_count = previous_not_close_count = previous_bills_count = \
                current_open_count = current_close_count = current_not_close_count = current_bills_count = 0
        previous_open_count = len(pre_not_close) + len(pre_presale_not_close)
        previous_close_count = len(pre_close_on_current) + len(pre_presale_close_on_current)
        previous_not_close_count = len(pre_not_close_on_current) + len(pre_presale_not_close_on_current)
        previous_bills_count = previous_open_count
        current_open_count = len(current_open) + len(current_presale_open)
        current_close_count = len(current_close) + len(current_presale_close)
        current_not_close_count = len(current_not_close) + len(current_presale_not_close)
        current_bills_count = current_open_count

        #cash_fee = check_fee =  member_card_fee = credit_card_fee = store_card_fee = free_fee = on_credit_fee = sales_voucher_fee = 0.0
        ret = {
                'cash_fee'                  : cash_fee,
                'check_fee'                 : check_fee,
                'member_card_fee'           : member_card_fee,
                'credit_card_fee'           : credit_card_fee,
                'store_card_fee'            : store_card_fee,
                'free_fee'                  : free_fee,
                'on_credit_fee'             : on_credit_fee,
                'sales_voucher_fee'         : sales_voucher_fee,
                'previous_open_count'       : previous_open_count,
                'previous_close_count'      : previous_close_count,
                'previous_not_close_count'  : previous_not_close_count,
                'previous_bills_count'      : previous_bills_count,
                'current_open_count'        : current_open_count,
                'current_close_count'       : current_close_count,
                'current_not_close_count'   : current_not_close_count,
                'current_bills_count'       : current_bills_count,
                'room_operate_ids'          : room_operate_ids,

                'sum_open_count'            : previous_open_count + current_open_count,
                'sum_close_count'           : previous_close_count + current_close_count,
                'sum_not_close_count'       : previous_not_close_count + current_not_close_count,
                'sum_bills_count'           : previous_bills_count + current_bills_count,
                'sum_fee'                   : cash_fee + check_fee + member_card_fee + credit_card_fee + sales_voucher_fee,
                }

        return ret

    def daily_report(self,cr,uid,start_datetime = None,end_datetime = None):
        '''
        日营业额统计报表,统计给定时间段的包厢费用信息
        默认情况下统计当日营业额
        NOTE 注意,此处传入的是日期类型是字符串
        :param start_datetime string default = None 形式如yyyy-mm-dd HH:MM:SS 统计起始时间,一般是根据营业时间计算的起始时间
        :param end_datetime string  default = None 形式如yyyy-mm-dd HH:MM:SS  统计结束时间,一般是根据营业时间计算的结束时间
        :return dict 营业额统计数据
        '''
        today_start_datetime,today_end_datetime = self.pool.get('ktv.opening_time_config').get_time_range(cr,uid)
        if not start_datetime or not end_datetime:
            start_datetime = ktv_helper.strftime(today_start_datetime)
            end_datetime = ktv_helper.strftime(today_end_datetime)

        #首先计算不同支付方式的费用
        #应计算以下业务:
        #A 在时间区间内关房的正常开房业务(开房时间不一定在区间内),也包括换房
        #B 在时间区间内发生的预售业务,(包括已关房的和未关房的)
        
        group_member_class_fee = {} #按照会员卡类别分组的费用
        group_room_type_fee = {} #按照包厢类别分组的实收金额费用
        cash_fee = member_card_fee = sales_voucher_fee = prepay_fee = free_fee = credit_card_fee  \
                = on_credit_fee = check_fee = store_card_fee = total_after_discount_fee = 0.0
        room_fee = hourly_fee = changed_room_fee = changed_room_hourly_fee = total_fee = total_discount_fee =  0.0
        song_ticket_minutes = 0
        #在本区间内的关房业务
        close_ids = self.search(cr,uid,[('close_time','>=',start_datetime),('close_time','<=',end_datetime)])
        close_ops = [op for op in self.browse(cr,uid,close_ids) if not op.is_presale]
        #在本区间内发生的预售业务
        presale_ids = self.search(cr,uid,[('operate_date','>=',start_datetime),('operate_date','<=',end_datetime)])
        presale_ops = [op for op in self.browse(cr,uid,presale_ids) if op.is_presale]

        for op in presale_ops + close_ops:
            cash_fee += op.total_after_discount_cash_fee
            member_card_fee += op.member_card_fee
            sales_voucher_fee += op.sales_voucher_fee
            prepay_fee += op.prepay_fee
            free_fee += op.free_fee
            credit_card_fee += op.credit_card_fee
            on_credit_fee += op.on_credit_fee
            total_after_discount_fee += op.total_after_discount_fee
            #--------------------
            room_fee += op.room_fee
            hourly_fee += op.hourly_fee
            changed_room_fee += op.changed_room_fee
            changed_room_hourly_fee += op.changed_room_hourly_fee
            total_fee += op.total_fee
            total_discount_fee += op.total_discount_fee
            song_ticket_minutes += song_ticket_minutes

            #以下计算按照会员级别分组的member_card_fee
            if op.last_member_id:
                member_class_id = op.last_member_id.member_class_id.id
                member_class_name = op.last_member_id.member_class_id.name
                member_class_fee = group_member_class_fee.get(member_class_id,[member_class_name,0.0])
                group_member_class_fee[member_class_id] = [member_class_name,member_class_fee[1] + op.member_card_fee]

            #以下按照不同的包厢类别计算实收金额

            room_type_id = op.last_room_id.room_type_id.id
            room_type_name = op.last_room_id.room_type_id.name
            room_type_fee = group_room_type_fee.get(room_type_id,[room_type_name,0.0])
            group_room_type_fee[room_type_id] = [room_type_name,room_type_fee[1] + op.total_after_discount_fee]

        return {
                'start_datetime' : start_datetime,
                'end_datetime' : end_datetime,
                'print_datetime' : ktv_helper.utc_now_str(),
                'cash_fee' : cash_fee,
                'member_card_fee' : member_card_fee,
                'credit_card_fee' : credit_card_fee,
                'sales_voucher_fee' : sales_voucher_fee,
                'free_fee' : free_fee,
                'on_credit_fee' : on_credit_fee,
                'check_fee' : check_fee,
                'prepay_fee' : prepay_fee,
                'store_card_fee' : store_card_fee,
                'total_after_discount_fee' : total_after_discount_fee,
                'room_fee' : room_fee,
                'hourly_fee' : hourly_fee,
                'changed_room_fee' : changed_room_fee,
                'changed_room_hourly_fee' : changed_room_hourly_fee,
                'total_fee' : total_fee,
                'total_discount_fee' : total_discount_fee,
                'song_ticket_minutes' : song_ticket_minutes,
                'group_member_class_fee' : group_member_class_fee.values(),
                'group_room_type_fee' : group_room_type_fee.values(),
                }





# vim:et:ts=4:sw=4: 
