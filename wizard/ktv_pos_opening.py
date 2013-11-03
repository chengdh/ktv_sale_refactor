# -*- coding: utf-8 -*-
from openerp.osv import osv, fields
from openerp.tools.translate import _

class ktv_pos_opening(osv.osv_memory):
    _name = 'ktv.pos.opening'

    _columns = {
        'opening_date' : fields.datetime('opening_date'),
    }
    _defualts = {
        'opening_date' : fields.datetime.now,
        }

    def open_ui(self, cr, uid, ids, context=None):
      '''
      打开POS收银系统
      '''
      return {
            'type' : 'ir.actions.client',
            'name' : _('ktv pos'),
            'tag' : 'ktv_room_pos.ui',
            'context' : context
        }

    def open_waiter_ui(self,cr,uid,ids,context = None):
      '''
      打开咨客系统
      '''
      #上下文变量是咨客
      context['ui_type'] = 'waiter'
      return {
          'type' : 'ir.actions.client',
          'name' : _('ktv waiter pos'),
          'tag' : 'ktv_room_pos.ui',
          'context' : context
          }
