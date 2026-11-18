/**
 * 站点统一配置 —— 所有数据入口都在这里
 * ─────────────────────────────────────────────
 * 改完保存、刷新页面即可；观看链接里的参数优先级更高。
 *
 * apiBase  后端接口地址：
 *           · Cloudflare Pages（推荐）：https://qweer.cn/api
 *           · 云开发：https://<环境ID>.service.tcloudbase.com/api
 *           · 自有服务器：https://qweer.cn/api（Nginx 反代 chat-server.js）
 *           · 留空 = 本机互通/读 products.js
 *
 * streamUrl 默认播放地址（HLS/MP4 直链）；开播页生成的链接会覆盖它。
 * room      默认房间号，一场直播一个房间。
 * viewers   观众页虚拟在线人数（≥10000；开播页真实在线不受影响）。
 * mirror    开播页默认开启「本机镜像到观看页」。
 * chatPoll  true = 弹幕用 3 秒轮询（Cloudflare Pages / 云函数）；
 *           false = 用 SSE 长连接（本机或自建 chat-server.js）。
 */
window.ZHIBO_CONFIG = {
  siteName: '聚光直播',
  domain: 'qweer.cn',
  publicBase: 'https://qweer.cn',

  apiBase: 'https://qweer.cn/api',   // 全站接口地址（Cloudflare Pages Functions）

  streamUrl: '',
  room: 'live',
  viewers: 12800,
  mirror: true,
  chatPoll: true
};
