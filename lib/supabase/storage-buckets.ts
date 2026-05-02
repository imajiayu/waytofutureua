/** Supabase Storage bucket 名字单点定义 */
export const STORAGE_BUCKETS = {
  /** 捐赠成果照片/视频（管理员上传，公开可读） */
  donationResults: 'donation-results',
  /** 义卖订单凭证（管理员上传，公开可读） */
  marketOrderResults: 'market-order-results',
} as const
