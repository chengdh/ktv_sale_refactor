# -*- coding: utf-8 -*-
#班次设置
from osv import fields, osv
import ktv_helper
from datetime import *
class work_shifts_config(osv.osv):
  _name = "ktv.work_shifts_config"

  _description = "工作班次"

  _order = 'start_time ASC'

  _columns = {
        "name": fields.char("name",required = True,help="班次名称" ),
        "start_time": fields.float("start_time",required = True,help="开始时间" ),
        "end_time": fields.float("end_time",required = True,help="结束时间" ),
      }

  def get_work_shift(self,cr,uid,a_datetime):
    '''
    获取给定时间所在班次
    :param a_datetime datetime 当前日期
    :return dict  班次信息
    '''

    ret = None
    ids = self.search(cr,uid,[])
    for c in self.read(cr,uid,ids):
      if ktv_helper.utc_time_between(c['start_time'],c['end_time'],a_datetime):
        ret = c

    ret['start_datetime'] = ktv_helper.float_time_to_datetime(ret['start_time'],base_datetime = a_datetime)
    ret['end_datetime'] = ktv_helper.float_time_to_datetime(ret['end_time'],base_datetime = a_datetime)
    
    if ret['start_time'] > ret['end_time']:
      ret['end_datetime'] = ret['end_datetime'] + timedelta(days = 1)

    return ret

  def get_previous_work_shift(self,cr,uid,a_datetime):
    '''
    获取给定时间所在班次的上一个班次
    :param a_datetime datetiem 要判定的日期
    :return dict 班次信息
    '''
    matched_config = None
    the_shift = self.get_work_shift(cr,uid,a_datetime)
    ids = self.search(cr,uid,[('start_time','<',the_shift['start_time'])],order = 'start_time DESC',limit = 1)
    #如果找到设置信息
    if ids:
      matched_config = self.read(cr,uid,ids[0])
    else:
      last_ids = self.search(cr,uid,[],order = 'start_time DESC',limit = 1)
      matched_config = self.read(cr,uid,last_ids[0])

    matched_config['start_datetime'] = ktv_helper.float_time_to_datetime(matched_config['start_time'],base_datetime = a_datetime)
    matched_config['end_datetime'] = ktv_helper.float_time_to_datetime(matched_config['end_time'],base_datetime = a_datetime)
    if matched_config['start_time'] > matched_config['end_time']:
      matched_config['end_datetime'] = matched_config['end_datetime'] + timedelta(days = 1)

    #如果前班日期大于a_datetime,则向前退1天
    if matched_config['start_datetime'] > a_datetime:
      matched_config['start_datetime'] = matched_config['start_datetime'] - timedelta(days = 1)
      matched_config['end_datetime'] = matched_config['end_datetime'] - timedelta(days = 1)
    
    return matched_config
