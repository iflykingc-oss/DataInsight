import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const GENERATOR_BUSINESS_001: SkillDefinition = {
  metadata: {
    id: 'generator-business-001',
    name: '通用业务报告生成器',
    version: '1.0.0',
    author: 'DataInsight',
    description: '通用业务报告生成器，支持多种输出格式',
    lifecycle: 'active',
    changeLog: [
      {
        version: '1.0.0',
        date: '2026-05-05',
        changes: ['初始版本'],
      },
    ],
    testCases: [],
  },
  type: 'generator',
  contract: {
    trigger: {
      keywords: ['生成报告', '业务报告', '分析报告'],
      patterns: [/生成.*报告/, /业务.*报告/],
    },
    input: {
      requiredFields: ['title', 'content'],
      optionalFields: ['format', 'sections'],
    },
    output: {
      schema: {
        report: 'string',
        format: 'string',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: ['report:write'],
      forbiddenActions: ['data:delete'],
    },
  },
  failureRules: {
    retryCount: 2,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const title = String(context.params?.title || '业务分析报告');
    const content = context.params?.content as Record<string, unknown> || {};
    const format = String(context.params?.format || 'markdown');
    const sections = (context.params?.sections as string[]) || ['summary', 'analysis', 'conclusion'];

    let report = '';

    switch (format) {
      case 'html':
        report = generateHtmlReport(title, content, sections);
        break;
      case 'json':
        report = JSON.stringify({ title, content, sections }, null, 2);
        break;
      case 'markdown':
      default:
        report = generateMarkdownReport(title, content, sections);
        break;
    }

    return {
      report,
      format,
    };
  },
};

function generateMarkdownReport(title: string, content: Record<string, unknown>, sections: string[]): string {
  const parts: string[] = [];
  parts.push(`# ${title}`);
  parts.push(`\n生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  for (const section of sections) {
    const sectionContent = content[section];
    if (sectionContent) {
      parts.push(`## ${section}`);
      if (typeof sectionContent === 'string') {
        parts.push(sectionContent);
      } else if (Array.isArray(sectionContent)) {
        sectionContent.forEach((item, i) => {
          parts.push(`${i + 1}. ${item}`);
        });
      } else {
        parts.push(JSON.stringify(sectionContent, null, 2));
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}

function generateHtmlReport(title: string, content: Record<string, unknown>, sections: string[]): string {
  const sectionHtml = sections.map(section => {
    const sectionContent = content[section];
    let contentHtml = '';
    if (typeof sectionContent === 'string') {
      contentHtml = `<p>${sectionContent}</p>`;
    } else if (Array.isArray(sectionContent)) {
      contentHtml = `<ul>${sectionContent.map(item => `<li>${item}</li>`).join('')}</ul>`;
    } else {
      contentHtml = `<pre>${JSON.stringify(sectionContent, null, 2)}</pre>`;
    }
    return `<section><h2>${section}</h2>${contentHtml}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
<h1>${title}</h1>
<p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
${sectionHtml}
</body>
</html>`;
}
