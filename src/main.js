import Vue from 'vue'
import App from './App.vue'
import { Button, Row, Col, Header, Main, Footer, Input, Message, Table, TableColumn, Drawer, Radio } from 'element-ui';

Vue.config.productionTip = false
// 将echarts挂载到Vue原型对象上
Vue.prototype.$echarts = window.echarts
Vue.use(Button)
Vue.use(Radio)
Vue.use(Row)
Vue.use(Col)
Vue.use(Header)
Vue.use(Main)
Vue.use(Footer)
Vue.use(Input)
Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Drawer)
Vue.prototype.$message = Message

new Vue({
  el: '#app',
  render: h => h(App),
}).$mount('#app')
