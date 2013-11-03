# -*- coding: utf-8 -*-
from osv import fields, osv
from datetime import datetime,timedelta 
import ktv_helper
class opening_time_config(osv.osv):
  _name = "ktv.opening_time_config"

  _description = "营业时间设置"

  _columns = {
        "open_time": fields.float("open_time",required = True,help="营业开始时间" ),
      }

  def get_time_range(self,cr,uid,base_datetime = datetime.now()):
    '''
    获取给定时间的营业时间
    默认取当日营业时间
    :param base_datetime datetime 给定营业时间点
    :return tuple(start_datetime,end_datetime)
    '''
    id = self.search(cr,uid,[])[0]
    open_datetime = ktv_helper.float_time_to_datetime(self.browse(cr,uid,id).open_time,base_datetime)
    close_datetime = open_datetime + timedelta(days = 1)
    return (open_datetime,close_datetime)

