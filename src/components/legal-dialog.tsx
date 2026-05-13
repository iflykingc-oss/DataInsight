'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'privacy' | 'terms';
}

export function LegalDocumentDialog({ open, onOpenChange, type }: LegalDocumentDialogProps) {
  const isPrivacy = type === 'privacy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPrivacy ? '隐私政策' : '服务条款'}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground/60">最后更新：2026年5月</p>

      <section>
        <h3 className="font-semibold text-foreground mb-2">1. 数据收集范围</h3>
        <p>我们仅收集为您提供服务所必需的最少数据：</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>账号信息</strong>：邮箱地址、用户名、显示名称</li>
          <li><strong>安全信息</strong>：加密存储的密码、安全问题（加密存储）</li>
          <li><strong>操作日志</strong>：登录/操作时间、状态（不包含 IP 地址或设备信息）</li>
          <li><strong>用户配置</strong>：您自定义的 AI 模型配置、仪表盘设置等</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">2. 我们不收集的数据</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>IP 地址或地理位置</li>
          <li>浏览器指纹或 User Agent</li>
          <li>设备标识符</li>
          <li>第三方 Cookie 或追踪器</li>
          <li>您的业务数据内容（表格、文件仅在浏览器端处理）</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">3. 数据存储与处理</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>您的业务数据（表格、文件）仅在浏览器端处理，不会上传到我们的服务器</li>
          <li>账号信息和操作日志存储在受保护的数据库中</li>
          <li>密码使用 bcrypt 单向加密存储，我们无法读取您的原始密码</li>
          <li>安全问题答案同样使用 bcrypt 加密存储</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">4. 数据保留期限</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>操作日志：保留 90 天后自动删除</li>
          <li>账号信息：在您使用服务期间保留，注销后立即删除</li>
          <li>仪表盘配置等用户偏好：存储在浏览器本地，不上传服务器</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">5. 您的权利</h3>
        <p>根据 GDPR、CCPA 等法规，您享有以下权利：</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>访问权</strong>：随时查看和导出您的个人数据</li>
          <li><strong>删除权（被遗忘权）</strong>：随时注销账号并删除所有个人数据</li>
          <li><strong>数据可携带权</strong>：以通用格式导出您的数据</li>
          <li><strong>更正权</strong>：修改不准确的个人信息</li>
          <li><strong>限制处理权</strong>：要求限制对您数据的处理</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">6. 数据安全</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>所有传输使用 TLS/HTTPS 加密</li>
          <li>数据库访问受行级安全策略（RLS）保护</li>
          <li>API 接口需 Bearer Token 认证</li>
          <li>管理操作有审计日志记录</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">7. 数据跨境传输</h3>
        <p>我们的数据服务可能位于美国等地区。如果您位于欧盟或中国，您的数据可能被传输到这些地区以外。我们通过标准合同条款（SCC）确保数据在跨境传输中的保护水平。</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">8. Cookie 和本地存储</h3>
        <p>我们使用浏览器本地存储（localStorage）保存您的偏好设置和登录状态。这些存储：</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>仅用于服务功能（非追踪）</li>
          <li>不包含个人身份信息</li>
          <li>您可随时通过浏览器设置清除</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">9. 儿童隐私</h3>
        <p>本服务不面向 16 岁以下儿童，我们不会有意收集儿童的个人信息。</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">10. 政策更新</h3>
        <p>我们可能会不时更新本隐私政策。重大变更将通过应用内通知或邮件告知您。继续使用服务即表示您同意更新后的政策。</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">11. 联系我们</h3>
        <p>如对本隐私政策有任何疑问，请通过应用内反馈功能联系管理员。</p>
      </section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground/60">最后更新：2026年5月</p>

      <section>
        <h3 className="font-semibold text-foreground mb-2">1. 服务说明</h3>
        <p>DataInsight 是一款智能表格数据分析与可视化平台，为用户提供数据处理、AI 分析和可视化展示功能。使用本服务即表示您同意以下条款。</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">2. 用户账号</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>您需提供真实、准确的注册信息</li>
          <li>您有责任保管好自己的账号和密码</li>
          <li>不得将账号转让、出售或借给他人使用</li>
          <li>如发现未经授权使用，应立即通知管理员</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">3. 用户数据</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>您上传的业务数据（表格、文件）仅在浏览器端处理，不上传到我们的服务器</li>
          <li>您保留对自身业务数据的完整所有权</li>
          <li>我们不会访问、使用或分享您的业务数据</li>
          <li>因浏览器端处理特性，请您及时保存和备份重要数据</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">4. AI 功能</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI 分析结果仅供参考，不构成专业建议</li>
          <li>AI 生成的内容可能存在不准确，用户应自行验证</li>
          <li>用户对基于 AI 结果做出的决策自行承担责任</li>
          <li>AI 功能依赖第三方模型服务，可用性不保证</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">5. 禁止行为</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>不得利用本服务从事违法活动</li>
          <li>不得尝试破解、攻击系统或他人账号</li>
          <li>不得上传恶意软件或病毒</li>
          <li>不得滥用 API 接口或进行过度请求</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">6. 服务变更与终止</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>我们保留随时修改或中断服务的权利</li>
          <li>重大变更将提前通知用户</li>
          <li>违反条款的账号可能被暂停或终止</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">7. 免责声明</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>本服务按"现状"提供，不做任何明示或暗示的保证</li>
          <li>对因使用本服务产生的任何直接或间接损失不承担责任</li>
          <li>不对第三方 AI 模型服务的准确性或可用性负责</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">8. 管辖法律</h3>
        <p>本条款适用中华人民共和国法律。如发生争议，双方应友好协商解决。</p>
      </section>
    </>
  );
}
