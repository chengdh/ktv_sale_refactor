# -*- coding: utf-8 -*-
import logging
from osv import fields, osv
from datetime import date,datetime
import decimal_precision as dp
import ktv_helper

_logger = logging.getLogger(__name__)

class res_users(osv.osv):
  '''
  extend res_users,添加权限相关设置
  NOTE 所有折扣数据都是以 100作为单位,例如 85为85折 90 为9折
  包括以下设置: A 默认房费折扣
                B 最低房费折扣
                C 默认酒水折扣
                D 最低酒水折扣
                E 免单权限
                F 挂账权限/挂账限额
                G 优惠限额 = 折扣费用 + 免单费用
  '''
  _positions_tuple = [('saler','销售经理'),('mananger','值班经理'),('server','服务人员')]
  _inherit = 'res.users'

  _columns = {
      'default_room_fee_discount' : fields.float('default_room_fee_discount',digits = (10,2),help='默认房费折扣'),
      'min_room_fee_discount' : fields.float('min_room_fee_discount',digits = (10,2),help='最低房费折扣'),
      'default_drinks_fee_discount' : fields.float('default_drinks_fee_discount',digits = (10,2),help='默认酒水费折扣'),
      'min_drinks_fee_discount': fields.float('min_drinks_fee_discount',digits = (10,2),help='最低酒水费折扣'),
      'free_power': fields.boolean('free_power',help='是否具备免单权限'),
      'free_fee_limit': fields.float('free_fee_limt',help='单张票据免单限额'),
      'on_credit_power': fields.boolean('on_credit_power',help='是否具备挂账权限'),
      'on_credit_fee_limit': fields.float('on_credit_fee_limit',digits = (10,2),help='挂账限额度'),
      'prompt_fee_limit': fields.float('prompt_fee_limit',digits = (10,2),help='优惠限额'),
      'input_card_no_power' : fields.boolean('input_card_no_power',help='是否可手工录入卡号'),
      'position' : fields.selection(_positions_tuple,'职务',help='职务'),
      }

  _defaults = {
      'default_room_fee_discount'   : 100,
      'min_room_fee_discount'       : 100,
      'default_drinks_fee_discount' : 100, 
      'min_drinks_fee_discount'     : 100,
      'free_power'                  : False,
      'free_fee_limit'              : 0,
      'on_credit_power'             : False,
      'on_credit_fee_limit'         : 0,
      'prompt_fee_limit'            : 0,
      'input_card_no_power'         : False,
      }
