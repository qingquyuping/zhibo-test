/**
 * 小黄车商品数据
 * ─────────────────────────────────────────────
 * 改完保存，刷新直播间页面即可生效。
 *
 * 字段说明：
 *   id        商品唯一标识（随便起，不要重复）
 *   title     商品名称
 *   price     现价（数字，单位元）
 *   original  原价（可选，数字；不填就不显示划线价）
 *   image     商品图地址（可选；支持 https 图片，加载失败会显示占位图）
 *   tag       角标文案（可选，如「包邮」「限量」「新品」）
 *   url       点击「去看看」跳转的购买链接（https 开头）
 *             可以填第三方商城商品页、微信小店、有赞/微盟的商品链接
 *
 * 注意：
 *   1. 这里只做展示和跳转，交易在链接那边的平台完成；
 *   2. 如果要跳小程序，普通 H5 不能直接跳，需要微信 JS-SDK 的开放标签，另说。
 */
window.ZHIBO_PRODUCTS = [
  {
    id: 'p1',
    title: '手冲咖啡豆 250g · 中浅烘',
    price: 89,
    original: 129,
    image: '',
    tag: '包邮',
    url: 'https://example.com/shop/coffee-beans'
  },
  {
    id: 'p2',
    title: '冷萃咖啡礼盒 6 瓶装',
    price: 159,
    original: 199,
    image: '',
    tag: '限量',
    url: 'https://example.com/shop/cold-brew-box'
  },
  {
    id: 'p3',
    title: '陶瓷马克杯 350ml',
    price: 45,
    original: 59,
    image: '',
    tag: '',
    url: 'https://example.com/shop/mug'
  },
  {
    id: 'p4',
    title: '帆布托特包 · 加厚',
    price: 39,
    original: 49,
    image: '',
    tag: '新品',
    url: 'https://example.com/shop/tote-bag'
  },
  {
    id: 'p5',
    title: '挂耳咖啡 10 片装',
    price: 59,
    image: '',
    tag: '',
    url: 'https://example.com/shop/drip-coffee'
  },
  {
    id: 'p6',
    title: '燕麦奶 1L × 2',
    price: 25,
    image: '',
    tag: '',
    url: ''
  }
];
