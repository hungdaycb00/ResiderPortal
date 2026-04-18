import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ScrollText, ShieldCheck, Scale, AlertTriangle, FileText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERMS_LAST_UPDATED = '17/04/2026';

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#12141a] border border-gray-700/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#12141a]/95 backdrop-blur-sm border-b border-gray-700/40 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Điều Khoản Dịch Vụ</h2>
                <p className="text-[11px] text-gray-500 font-medium">Cập nhật lần cuối: {TERMS_LAST_UPDATED}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 terms-scroll">
            {/* Intro */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/15">
              <p className="text-sm text-gray-300 leading-relaxed">
                Chào mừng bạn đến với <strong className="text-white">Alin</strong>. Bằng việc tạo tài khoản và sử dụng nền tảng, 
                bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các Điều khoản Dịch vụ dưới đây.
                Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không đăng ký hoặc sử dụng dịch vụ.
              </p>
            </div>

            {/* Section 1 */}
            <TermsSection
              icon={<FileText className="w-4 h-4" />}
              number="1"
              title="Định Nghĩa & Phạm Vi"
              color="blue"
            >
              <p>Trong Điều khoản này, các thuật ngữ sau được hiểu như sau:</p>
              <ul>
                <li><strong>"Nền tảng"</strong> — hệ thống Alin, bao gồm toàn bộ website, ứng dụng, máy chủ, API và các dịch vụ liên quan.</li>
                <li><strong>"Nhà phát hành"</strong> (Publisher) — Alin, đơn vị vận hành và quản lý Nền tảng.</li>
                <li><strong>"Người dùng"</strong> (User/Creator) — cá nhân hoặc tổ chức đăng ký tài khoản và sử dụng Nền tảng.</li>
                <li><strong>"Nội dung"</strong> — bao gồm nhưng không giới hạn: trò chơi (game), mã nguồn, hình ảnh, âm thanh, thiết kế giao diện, tài nguyên đồ họa, và mọi nội dung kỹ thuật số khác được Người dùng tải lên hoặc tạo ra trên Nền tảng.</li>
                <li><strong>"Dịch vụ"</strong> — toàn bộ tính năng mà Nền tảng cung cấp, bao gồm lưu trữ, phân phối, hiển thị và thương mại hóa Nội dung.</li>
              </ul>
            </TermsSection>

            {/* Section 2 */}
            <TermsSection
              icon={<ShieldCheck className="w-4 h-4" />}
              number="2"
              title="Cấp Phép & Quyền Sở Hữu Trí Tuệ"
              color="emerald"
            >
              <p className="font-semibold text-amber-400/90 text-[13px]">⚠️ Đây là điều khoản cốt lõi — vui lòng đọc kỹ.</p>
              
              <p><strong>2.1. Quyền giữ lại của Người dùng:</strong>{' '}
                Người dùng giữ lại quyền sở hữu trí tuệ gốc đối với Nội dung do mình tạo ra, 
                trừ khi Nội dung đó vi phạm quyền sở hữu trí tuệ của bên thứ ba.
              </p>
              
              <p><strong>2.2. Cấp phép cho Alin (Đồng Sở Hữu):</strong>{' '}
                Bằng việc tải lên, xuất bản hoặc phân phối Nội dung trên Nền tảng, Người dùng cấp cho Alin 
                một <strong>giấy phép toàn cầu, không thể thu hồi, không độc quyền, vĩnh viễn, có thể chuyển nhượng và cấp phép lại</strong> để:
              </p>
              <ul>
                <li>Lưu trữ, sao chép, chỉnh sửa, tạo tác phẩm phái sinh từ Nội dung;</li>
                <li>Phân phối, hiển thị công khai, truyền tải và cung cấp Nội dung tới mọi người chơi và đối tác;</li>
                <li>Sử dụng Nội dung cho mục đích <strong>thương mại hóa</strong>, bao gồm nhưng không giới hạn: quảng cáo, tích hợp hệ thống kiếm tiền, bán gói nội dung, hợp tác kinh doanh;</li>
                <li>Tích hợp Nội dung vào các sản phẩm, dịch vụ hoặc chiến dịch tiếp thị của Alin.</li>
              </ul>
              <p className="text-gray-400 italic text-xs">
                (Tham chiếu: Khoản này hoạt động tương tự mô hình cấp phép UGC của Steam Workshop và Google Play Developer Distribution Agreement — 
                nơi nền tảng được cấp quyền rộng rãi để phân phối và thương mại hóa nội dung do người dùng tạo.)
              </p>
              
              <p><strong>2.3. Đồng sở hữu trên Nền tảng:</strong>{' '}
                Mọi Nội dung được xuất bản trên Alin sẽ được coi là tài sản <strong>đồng sở hữu</strong> giữa Người dùng (Creator) và Alin (Publisher). 
                Điều này có nghĩa Alin có quyền tự do khai thác, phân phối và thương mại hóa Nội dung 
                mà không cần xin phép Người dùng cho từng hành động cụ thể.
              </p>
              
              <p><strong>2.4. Giấy phép tồn tại vĩnh viễn:</strong>{' '}
                Giấy phép được cấp theo Mục 2.2 sẽ tiếp tục có hiệu lực ngay cả sau khi Người dùng xóa Nội dung hoặc hủy tài khoản, 
                đối với mọi bản sao đã được phân phối, tích hợp hoặc sử dụng trước thời điểm xóa/hủy.
              </p>
            </TermsSection>

            {/* Section 3 */}
            <TermsSection
              icon={<Scale className="w-4 h-4" />}
              number="3"
              title="Quyền Thương Mại Hóa & Doanh Thu"
              color="amber"
            >
              <p><strong>3.1.</strong>{' '}
                Alin có toàn quyền quyết định phương thức thương mại hóa Nội dung trên Nền tảng, 
                bao gồm nhưng không giới hạn: chèn quảng cáo, tích hợp mô hình thanh toán trong ứng dụng (in-app purchase), 
                bán gói nội dung, hoặc cấp phép cho bên thứ ba.
              </p>
              <p><strong>3.2.</strong>{' '}
                Trong giai đoạn hiện tại, toàn bộ doanh thu phát sinh từ việc thương mại hóa Nội dung trên Nền tảng thuộc về Alin, 
                trừ khi có thỏa thuận chia sẻ doanh thu (Revenue Share) riêng biệt bằng văn bản giữa Alin và Người dùng.
              </p>
              <p><strong>3.3.</strong>{' '}
                Alin có thể, nhưng không bắt buộc, triển khai chương trình chia sẻ doanh thu cho Creator trong tương lai. 
                Tỷ lệ và điều kiện sẽ được thông báo riêng và chỉ áp dụng khi có thỏa thuận chính thức.
              </p>
              <p className="text-gray-400 italic text-xs">
                (Tham chiếu: Apple App Store giữ lại tối đa 30% doanh thu; Google Play giữ 15-30%; 
                Valve/Steam có thể giữ tới 30%. Alin bảo lưu quyền thiết lập tỷ lệ phù hợp cho nền tảng.)
              </p>
            </TermsSection>

            {/* Section 4 */}
            <TermsSection
              icon={<AlertTriangle className="w-4 h-4" />}
              number="4"
              title="Cam Kết & Trách Nhiệm Của Người Dùng"
              color="red"
            >
              <p><strong>4.1. Cam kết bản quyền:</strong>{' '}
                Người dùng cam kết và đảm bảo rằng mọi Nội dung do mình tải lên là nguyên bản hoặc đã được cấp phép hợp pháp. 
                Người dùng <strong>chịu hoàn toàn trách nhiệm pháp lý</strong> nếu Nội dung được tải lên vi phạm quyền sở hữu trí tuệ, 
                bản quyền, nhãn hiệu hoặc bất kỳ quyền nào của bên thứ ba.
              </p>
              <p><strong>4.2. Bồi thường và Miễn trừ (Indemnification):</strong>{' '}
                Người dùng đồng ý bồi thường, bảo vệ và miễn trừ cho Alin, cùng với các giám đốc, nhân viên, đối tác và đại lý 
                khỏi mọi khiếu nại, tổn thất, thiệt hại, chi phí pháp lý (bao gồm phí luật sư) phát sinh từ hoặc liên quan đến:
              </p>
              <ul>
                <li>Vi phạm Điều khoản Dịch vụ này của Người dùng;</li>
                <li>Nội dung do Người dùng tải lên vi phạm quyền sở hữu trí tuệ hoặc luật pháp hiện hành;</li>
                <li>Hành vi gian lận, lạm dụng hệ thống hoặc vi phạm pháp luật của Người dùng.</li>
              </ul>
              <p><strong>4.3. Nội dung bị cấm:</strong>{' '}
                Người dùng không được tải lên Nội dung có tính chất:
                bạo lực cực đoan, khiêu dâm, phân biệt chủng tộc, xúi gắn thù hận, 
                vi phạm pháp luật Việt Nam hoặc pháp luật quốc tế, 
                hoặc bất kỳ nội dung nào mà Alin, theo đánh giá độc lập, cho là không phù hợp.
              </p>
            </TermsSection>

            {/* Section 5 */}
            <TermsSection
              icon={<ShieldCheck className="w-4 h-4" />}
              number="5"
              title="Quyền Quản Lý & Gỡ Bỏ Nội Dung"
              color="violet"
            >
              <p><strong>5.1.</strong>{' '}
                Alin bảo lưu quyền đơn phương <strong>gỡ bỏ, ẩn, chỉnh sửa hoặc từ chối</strong> bất kỳ Nội dung nào 
                vào bất kỳ thời điểm nào, có hoặc không cần thông báo trước, nếu Alin cho rằng Nội dung đó:
              </p>
              <ul>
                <li>Vi phạm Điều khoản Dịch vụ này;</li>
                <li>Vi phạm quyền sở hữu trí tuệ của bên thứ ba;</li>
                <li>Gây rủi ro pháp lý, bảo mật hoặc ảnh hưởng tiêu cực đến Nền tảng;</li>
                <li>Không phù hợp với mục tiêu, chiến lược hoặc tiêu chuẩn chất lượng của Alin.</li>
              </ul>
              <p><strong>5.2. Xử lý vi phạm bản quyền (DMCA):</strong>{' '}
                Alin tuân thủ quy trình thông báo và gỡ bỏ theo tiêu chuẩn DMCA. 
                Khi nhận được thông báo vi phạm bản quyền hợp lệ từ bên thứ ba, 
                Alin sẽ xử lý gỡ bỏ nội dung kịp thời. 
                Người dùng vi phạm nhiều lần có thể bị <strong>khóa tài khoản vĩnh viễn</strong>.
              </p>
              <p><strong>5.3.</strong>{' '}
                Alin có quyền <strong>đình chỉ hoặc xóa vĩnh viễn</strong> tài khoản Người dùng nếu phát hiện vi phạm nghiêm trọng, 
                mà không phải chịu trách nhiệm bồi thường hay đền bù dưới bất kỳ hình thức nào.
              </p>
            </TermsSection>

            {/* Section 6 */}
            <TermsSection
              icon={<Scale className="w-4 h-4" />}
              number="6"
              title="Giới Hạn Trách Nhiệm & Miễn Trừ Bảo Đảm"
              color="gray"
            >
              <p><strong>6.1. Dịch vụ "nguyên trạng" (AS IS):</strong>{' '}
                Nền tảng được cung cấp "NGUYÊN TRẠNG" (AS IS) và "NHƯ SẴN CÓ" (AS AVAILABLE). 
                Alin không đảm bảo rằng Dịch vụ sẽ hoạt động liên tục, không lỗi, an toàn tuyệt đối 
                hoặc đáp ứng mọi yêu cầu của Người dùng.
              </p>
              <p><strong>6.2. Giới hạn trách nhiệm:</strong>{' '}
                Trong mọi trường hợp, tổng trách nhiệm pháp lý của Alin đối với Người dùng 
                sẽ không vượt quá số tiền mà Người dùng đã thực tế thanh toán cho Alin trong 12 tháng gần nhất 
                (nếu có), hoặc 0 đồng nếu Người dùng sử dụng dịch vụ miễn phí.
              </p>
              <p><strong>6.3.</strong>{' '}
                Alin không chịu trách nhiệm về mọi thiệt hại gián tiếp, ngẫu nhiên, đặc biệt, mang tính hệ quả 
                hoặc trừng phạt, bao gồm mất dữ liệu, mất doanh thu, mất lợi nhuận hoặc gián đoạn kinh doanh.
              </p>
            </TermsSection>

            {/* Section 7 */}
            <TermsSection
              icon={<FileText className="w-4 h-4" />}
              number="7"
              title="Từ Bỏ Quyền Khởi Kiện & Giải Quyết Tranh Chấp"
              color="cyan"
            >
              <p><strong>7.1.</strong>{' '}
                Bằng việc sử dụng Nền tảng, Người dùng đồng ý <strong>từ bỏ quyền khởi kiện tập thể</strong> (class action waiver) 
                đối với Alin. Mọi tranh chấp phải được giải quyết theo hình thức cá nhân.
              </p>
              <p><strong>7.2.</strong>{' '}
                Mọi tranh chấp phát sinh sẽ được giải quyết thông qua thương lượng thiện chí giữa hai bên trong vòng 30 ngày. 
                Nếu không đạt được thỏa thuận, tranh chấp sẽ được đưa ra giải quyết tại Tòa án có thẩm quyền tại Việt Nam, 
                theo pháp luật Việt Nam.
              </p>
              <p><strong>7.3.</strong>{' '}
                Người dùng đồng ý rằng mọi khiếu nại phải được đệ trình trong vòng <strong>1 năm</strong> kể từ khi sự kiện gây ra khiếu nại xảy ra. 
                Sau thời hạn này, quyền khiếu nại sẽ bị từ bỏ vĩnh viễn.
              </p>
            </TermsSection>

            {/* Section 8 */}
            <TermsSection
              icon={<ScrollText className="w-4 h-4" />}
              number="8"
              title="Điều Khoản Chung"
              color="blue"
            >
              <p><strong>8.1. Sửa đổi Điều khoản:</strong>{' '}
                Alin có quyền cập nhật, sửa đổi hoặc thay thế Điều khoản Dịch vụ này vào bất kỳ lúc nào. 
                Việc tiếp tục sử dụng Nền tảng sau khi Điều khoản được cập nhật đồng nghĩa với việc Người dùng chấp nhận phiên bản mới.
              </p>
              <p><strong>8.2. Tách rời:</strong>{' '}
                Nếu bất kỳ điều khoản nào trong Thỏa thuận này bị tuyên bố vô hiệu hoặc không thể thi hành, 
                các điều khoản còn lại vẫn tiếp tục có hiệu lực đầy đủ.
              </p>
              <p><strong>8.3. Toàn bộ Thỏa thuận:</strong>{' '}
                Điều khoản Dịch vụ này cùng với Chính sách Bảo mật tạo thành toàn bộ thỏa thuận giữa Người dùng và Alin, 
                thay thế mọi thỏa thuận hoặc cam kết trước đó.
              </p>
              <p><strong>8.4. Ngôn ngữ:</strong>{' '}
                Phiên bản tiếng Việt của Điều khoản này là phiên bản chính thức và có giá trị pháp lý ràng buộc. 
                Mọi bản dịch (nếu có) chỉ mang tính tham khảo.
              </p>
            </TermsSection>

            {/* Footer */}
            <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 text-center">
              <p className="text-xs text-gray-500">
                © {new Date().getFullYear()} Alin. Bảo lưu mọi quyền.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Bằng việc tạo tài khoản, bạn xác nhận đã đọc và đồng ý với toàn bộ Điều khoản trên.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-0 bg-[#12141a]/95 backdrop-blur-sm border-t border-gray-700/40 px-6 py-4 shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
            >
              Tôi Đã Đọc — Đóng
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* Reusable Section Component */
function TermsSection({ icon, number, title, color, children }: {
  icon: React.ReactNode;
  number: string;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/15 to-red-600/5 border-red-500/20 text-red-400',
    violet: 'from-violet-500/15 to-violet-600/5 border-violet-500/20 text-violet-400',
    gray: 'from-gray-500/15 to-gray-600/5 border-gray-500/20 text-gray-400',
    cyan: 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
  };
  const classes = colorMap[color] || colorMap.blue;
  const [gradientClasses, textClass] = [classes.split(' ').slice(0, 3).join(' '), classes.split(' ').pop()];

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${gradientClasses} border`}>
        <span className={`${textClass}`}>{icon}</span>
        <h3 className="text-sm font-bold text-white">
          Điều {number}. {title}
        </h3>
      </div>
      <div className="pl-4 space-y-2 text-[13px] text-gray-300 leading-relaxed terms-content">
        {children}
      </div>
    </div>
  );
}
