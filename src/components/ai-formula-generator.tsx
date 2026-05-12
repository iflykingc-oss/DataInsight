'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Wand2, Check, Copy, Lightbulb, Sparkles, Code, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ParsedData } from '@/lib/data-processor';

interface AIFormulaGeneratorProps {
  data: ParsedData;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  onApplyFormula?: (formula: string, targetColumn: string) => void;
}

interface FormulaExample {
  id: string;
  category: string;
  description: string;
  formula: string;
  explanation: string;
}

const FORMULA_EXAMPLES: FormulaExample[] = [
  // 数据统计类 (49)
  { id: "1", category: "数据统计", description: "统计A列中\"已完成\"的记录数", formula: "COUNTIF(A:A, \"已完成\")", explanation: "使用COUNTIF统计A列中等于\"已完成\"的数量" },
  { id: "2", category: "数据统计", description: "计算A列总和", formula: "SUM(A:A)", explanation: "求A列所有数值之和" },
  { id: "3", category: "数据统计", description: "计算A列平均值", formula: "AVERAGE(A:A)", explanation: "求A列所有数值的算术平均" },
  { id: "4", category: "数据统计", description: "计算A列最大值", formula: "MAX(A:A)", explanation: "返回A列中的最大值" },
  { id: "5", category: "数据统计", description: "计算A列最小值", formula: "MIN(A:A)", explanation: "返回A列中的最小值" },
  { id: "6", category: "数据统计", description: "统计A列数值单元格个数", formula: "COUNT(A:A)", explanation: "统计A列中含数字的单元格数" },
  { id: "7", category: "数据统计", description: "统计A列非空单元格个数", formula: "COUNTA(A:A)", explanation: "统计A列中非空的单元格数" },
  { id: "8", category: "数据统计", description: "计算A1占A列总和的百分比", formula: "A1/SUM(A:A)", explanation: "计算A1占A列总和的百分比" },
  { id: "9", category: "数据统计", description: "计算B列相邻单元格增长率", formula: "(B2-B1)/B1", explanation: "计算B列相邻行的环比增长率" },
  { id: "10", category: "数据统计", description: "计算同比增长率", formula: "IF(B2=0, \"N/A\", (C2-B2)/B2)", explanation: "用今年减去年再除以去年，B2=0时返回N/A" },
  { id: "11", category: "数据统计", description: "按金额区间自动分级", formula: "IF(D2>=10000, \"高\", IF(D2>=3000, \"中\", \"低\"))", explanation: "嵌套IF判断金额等级" },
  { id: "12", category: "数据统计", description: "返回A列第2大的值", formula: "LARGE(A:A, 2)", explanation: "返回A列第2大的数值" },
  { id: "13", category: "数据统计", description: "返回A列第3小的值", formula: "SMALL(A:A, 3)", explanation: "返回A列第3小的数值" },
  { id: "14", category: "数据统计", description: "计算A列排名的名次", formula: "RANK(A2, $A$2:$A$100, 0)", explanation: "返回A2在A2:A100中的排名" },
  { id: "15", category: "数据统计", description: "计算A列样本标准差", formula: "STDEV(A:A)", explanation: "计算A列数值的样本标准差" },
  { id: "16", category: "数据统计", description: "计算A列样本方差", formula: "VAR(A:A)", explanation: "计算A列数值的样本方差" },
  { id: "17", category: "数据统计", description: "计算A列中位数", formula: "MEDIAN(A:A)", explanation: "返回A列数值的中位数" },
  { id: "18", category: "数据统计", description: "计算A列众数", formula: "MODE(A:A)", explanation: "返回A列中出现次数最多的值" },
  { id: "19", category: "数据统计", description: "统计同时满足A>100且B<50的个数", formula: "COUNTIFS(A:A, \">100\", B:B, \"<50\")", explanation: "多条件计数" },
  { id: "20", category: "数据统计", description: "计算A列乘积的总和", formula: "SUMPRODUCT(A:A, B:B)", explanation: "返回A列和B列对应元素乘积之和" },
  { id: "21", category: "数据统计", description: "返回A列唯一值个数", formula: "ROWS(UNIQUE(A:A))", explanation: "统计A列中有多少个不重复的值" },
  { id: "22", category: "数据统计", description: "统计A列大于0的数值个数", formula: "COUNTIF(A:A, \">0\")", explanation: "统计A列中大于0的单元格数量" },
  { id: "23", category: "数据统计", description: "计算A列绝对值的总和", formula: "SUMPRODUCT(ABS(A:A))", explanation: "返回A列所有数值的绝对值之和" },
  { id: "24", category: "数据统计", description: "返回A列的第50百分位数", formula: "PERCENTILE(A:A, 0.5)", explanation: "返回A列的第50百分位数" },
  { id: "25", category: "数据统计", description: "计算A列数据的四分位数", formula: "QUARTILE(A:A, 1)", explanation: "返回A列的第一四分位数" },
  { id: "26", category: "数据统计", description: "统计A列中\"北京\"出现的次数", formula: "COUNTIF(A:A, \"北京\")", explanation: "统计A列中等于\"北京\"的数量" },
  { id: "27", category: "数据统计", description: "统计A列大于平均值的个数", formula: "COUNTIF(A:A, \">\"&AVERAGE(A:A))", explanation: "统计A列中大于平均值的数量" },
  { id: "28", category: "数据统计", description: "返回A列最大值的行号", formula: "MATCH(MAX(A:A), A:A, 0)", explanation: "返回A列最大值所在行的行号" },
  { id: "29", category: "数据统计", description: "计算每行A/B的百分比", formula: "IF(B2=0, 0, A2/B2)", explanation: "计算A/B，避开除零错误" },
  { id: "30", category: "数据统计", description: "返回A列前5个值的平均值", formula: "AVERAGE(LARGE(A:A, {1,2,3,4,5}))", explanation: "计算A列前5个最大值的平均" },
  { id: "31", category: "数据统计", description: "计算A列的累计总和", formula: "SUM($A$2:A2)", explanation: "从A2到当前行的累计求和" },
  { id: "32", category: "数据统计", description: "统计A列中包含\"企\"的个数", formula: "COUNTIF(A:A, \"*企*\")", explanation: "通配符统计包含\"企\"的单元格" },
  { id: "33", category: "数据统计", description: "计算A列最大值与最小值之差", formula: "MAX(A:A)-MIN(A:A)", explanation: "返回A列的数值范围" },
  { id: "34", category: "数据统计", description: "计算加权平均(A列数值,B列权重)", formula: "SUMPRODUCT(A:A, B:B)/SUM(B:B)", explanation: "计算A列的加权平均值" },
  { id: "35", category: "数据统计", description: "统计A列空白单元格个数", formula: "COUNTBLANK(A:A)", explanation: "统计A列中空白单元格的数量" },
  { id: "36", category: "数据统计", description: "返回A列最后非空单元格的值", formula: "LOOKUP(2, 1/(A:A<>\"\"), A:A)", explanation: "返回A列最后一个非空单元格的值" },
  { id: "37", category: "数据统计", description: "返回A列最后非空行号", formula: "MAX(IF(A:A<>\"\", ROW(A:A), 0))", explanation: "返回A列最后一个非空单元格的行号" },
  { id: "38", category: "数据统计", description: "计算所有正数的总和", formula: "SUMIF(A:A, \">0\")", explanation: "只对A列正数求和" },
  { id: "39", category: "数据统计", description: "计算所有负数的总和", formula: "SUMIF(A:A, \"<0\")", explanation: "只对A列负数求和" },
  { id: "40", category: "数据统计", description: "返回A列倒数第N行的值", formula: "INDEX(A:A, COUNTA(A:A)-N+1)", explanation: "返回A列倒数第N行的值" },
  { id: "41", category: "数据统计", description: "计算每行占分类小计的比例", formula: "A2/SUMIF($B:$B, B2, $A:$A)", explanation: "每行A列占其B列分类小计的比例" },
  { id: "42", category: "数据统计", description: "返回A列第N大的值(N在C2)", formula: "LARGE(A:A, C2)", explanation: "根据C2指定的排名返回对应值" },
  { id: "43", category: "数据统计", description: "统计每种分类的个数", formula: "COUNTIF($B$2:$B$100, B2)", explanation: "B列每种值出现的次数" },
  { id: "44", category: "数据统计", description: "返回A列最大值对应的B列值", formula: "INDEX(B:B, MATCH(MAX(A:A), A:A, 0))", explanation: "返回A列最大值对应的B列内容" },
  { id: "45", category: "数据统计", description: "条件平均值", formula: "AVERAGEIF(A:A, \">100\")", explanation: "返回A列大于100的数值的平均" },
  { id: "46", category: "数据统计", description: "条件最大值", formula: "MAXIFS(A:A, B:B, \"销售部\")", explanation: "返回B列为\"销售部\"对应的A列最大值" },
  { id: "47", category: "数据统计", description: "条件最小值", formula: "MINIFS(A:A, B:B, \"销售部\")", explanation: "返回B列为\"销售部\"对应的A列最小值" },
  { id: "48", category: "数据统计", description: "条件求和(精确)", formula: "SUMIF(A:A, \"北京\", B:B)", explanation: "A列为\"北京\"的B列求和" },
  { id: "49", category: "数据统计", description: "多条件求和", formula: "SUMIFS(C:C, A:A, \"北京\", B:B, \">10000\")", explanation: "A列=北京且B列>10000的C列求和" },
  // 条件判断类 (40)
  { id: "50", category: "条件判断", description: "按分数自动评定等级", formula: "IF(A1>=90, \"优\", IF(A1>=80, \"良\", IF(A1>=60, \"及格\", \"不及格\")))", explanation: "嵌套IF评定成绩等级" },
  { id: "51", category: "条件判断", description: "标记达标与未达标", formula: "IF(A1>=100, \"达标\", \"未达标\")", explanation: "判断A1是否达到100" },
  { id: "52", category: "条件判断", description: "根据业绩计算奖金", formula: "IF(A1>=10000, A1*0.1, IF(A1>=5000, A1*0.05, 0))", explanation: "分段计算奖金" },
  { id: "53", category: "条件判断", description: "判断日期是否已过期", formula: "IF(A1<TODAY(), \"已过期\", \"在有效期内\")", explanation: "判断A1日期是否过期" },
  { id: "54", category: "条件判断", description: "员工转正状态判断", formula: "IF(B1>=3, \"可转正\", \"试用期\")", explanation: "B1为工作月数" },
  { id: "55", category: "条件判断", description: "判断是否需要付违约金", formula: "IF(C1<TODAY(), \"需付违约金\", \"正常\")", explanation: "C1为合同到期日" },
  { id: "56", category: "条件判断", description: "根据年龄分组", formula: "IF(A1>=60, \"老年\", IF(A1>=40, \"中年\", IF(A1>=18, \"青年\", \"未成年\")))", explanation: "按年龄自动分组" },
  { id: "57", category: "条件判断", description: "绩效等级评定", formula: "IF(B1>=95, \"A+\", IF(B1>=85, \"A\", IF(B1>=75, \"B\", \"C\")))", explanation: "按绩效得分评定等级" },
  { id: "58", category: "条件判断", description: "交通信号灯判断", formula: "IF(A1>=80, \"绿灯\", IF(A1>=60, \"黄灯\", \"红灯\"))", explanation: "用红黄绿表示风险等级" },
  { id: "59", category: "条件判断", description: "客户价值分类", formula: "IF(A1>=10000, \"VIP\", IF(A1>=5000, \"重要\", \"普通\"))", explanation: "按消费金额分类客户" },
  { id: "60", category: "条件判断", description: "判断是否周末", formula: "IF(WEEKDAY(A1, 2)>=6, \"周末\", \"工作日\")", explanation: "判断A1是星期几" },
  { id: "61", category: "条件判断", description: "返回非错误值否则0", formula: "IFERROR(A1/B1, 0)", explanation: "计算A1/B1，出错时返回0" },
  { id: "62", category: "条件判断", description: "返回非空值否则默认值", formula: "IF(A1<>\"\", A1, \"未知\")", explanation: "A1为空时返回\"未知\"" },
  { id: "63", category: "条件判断", description: "判断两列是否一致", formula: "IF(A1=B1, \"一致\", \"不一致\")", explanation: "比较A1和B1是否相同" },
  { id: "64", category: "条件判断", description: "多条件判断状态", formula: "IFS(A1>=90, \"优秀\", A1>=80, \"良好\", TRUE, \"不合格\")", explanation: "多条件依次判断" },
  { id: "65", category: "条件判断", description: "条件计数(模糊)", formula: "COUNTIF(A:A, \"*经理*\")", explanation: "统计A列中包含\"经理\"的单元格数" },
  { id: "66", category: "条件判断", description: "判断是否为闰年", formula: "IF(MOD(YEAR(A1), 4)=0, \"闰年\", \"平年\")", explanation: "判断A1日期所在年份是否为闰年" },
  { id: "67", category: "条件判断", description: "判断单元格是否为空", formula: "IF(ISBLANK(A1), \"空\", \"有值\")", explanation: "判断A1是否为空单元格" },
  { id: "68", category: "条件判断", description: "判断是否为数字", formula: "IF(ISNUMBER(A1), \"数字\", \"非数字\")", explanation: "判断A1内容是否为数字" },
  { id: "69", category: "条件判断", description: "判断是否为文本", formula: "IF(ISTEXT(A1), \"文本\", \"非文本\")", explanation: "判断A1内容是否为文本" },
  { id: "70", category: "条件判断", description: "判断是否为错误值", formula: "IF(ISERROR(A1), \"错误\", A1)", explanation: "判断A1是否为错误值" },
  { id: "71", category: "条件判断", description: "判断是否包含特定字符", formula: "IF(ISNUMBER(FIND(\"公司\", A1)), \"包含\", \"不包含\")", explanation: "判断A1是否包含\"公司\"" },
  { id: "72", category: "条件判断", description: "按等级返回对应分值", formula: "VLOOKUP(A1, {\"优\",100;\"良\",80;\"及格\",60;\"不及格\",0}, 2, 0)", explanation: "根据等级返回分值" },
  { id: "73", category: "条件判断", description: "评分转星级", formula: "REPT(\"★\", ROUND(A1/20, 0))", explanation: "将0-100分转换为星级" },
  { id: "74", category: "条件判断", description: "计算税费(累进制)", formula: "IF(A1<=3000, A1*0.03, IF(A1<=12000, A1*0.1-210, IF(A1<=25000, A1*0.2-1410, A1*0.25-2660)))", explanation: "个税累进计算" },
  { id: "75", category: "条件判断", description: "判断星期并返回名称", formula: "CHOOSE(WEEKDAY(A1), \"周日\", \"周一\", \"周二\", \"周三\", \"周四\", \"周五\", \"周六\")", explanation: "返回星期名称" },
  { id: "76", category: "条件判断", description: "判断是否为季度末", formula: "IF(MONTH(A1)=MONTH(EOMONTH(A1, 0)), \"季末\", \"非季末\")", explanation: "判断A1是否为季度最后一个月" },
  { id: "77", category: "条件判断", description: "发票是否重复", formula: "IF(COUNTIF($A$2:A1, A1)>1, \"重复\", \"正常\")", explanation: "判断A列是否有重复值" },
  { id: "78", category: "条件判断", description: "根据工龄计算年假", formula: "IF(B1>=10, 10, IF(B1>=5, 7, IF(B1>=1, 5, 0)))", explanation: "工龄10年10天假，5年7天，1年5天" },
  { id: "79", category: "条件判断", description: "订单优先级排序值", formula: "IF(D1=\"紧急\", 1, IF(D1=\"高\", 2, IF(D1=\"中\", 3, 4)))", explanation: "返回订单优先级数字" },
  { id: "80", category: "条件判断", description: "判断盈亏状态", formula: "IF(B1-C1>0, \"盈利\", IF(B1-C1<0, \"亏损\", \"持平\"))", explanation: "判断盈亏" },
  { id: "81", category: "条件判断", description: "判断学生是否及格", formula: "IF(A1>=60, \"及格\", \"不及格\")", explanation: "A1>=60为及格" },
  { id: "82", category: "条件判断", description: "判断数量是否足额", formula: "IF(B1>=A1, \"足额\", \"不足\"&(A1-B1))", explanation: "判断B1是否达到A1" },
  { id: "83", category: "条件判断", description: "返回绝对值", formula: "ABS(A1)", explanation: "返回A1的绝对值" },
  { id: "84", category: "条件判断", description: "返回平方根", formula: "SQRT(A1)", explanation: "返回A1的平方根" },
  { id: "85", category: "条件判断", description: "返回幂次方", formula: "POWER(A1, 3)", explanation: "返回A1的立方" },
  { id: "86", category: "条件判断", description: "返回自然指数", formula: "EXP(A1)", explanation: "返回e的A1次方" },
  { id: "87", category: "条件判断", description: "返回自然对数", formula: "LN(A1)", explanation: "返回A1的自然对数" },
  { id: "88", category: "条件判断", description: "返回常用对数", formula: "LOG10(A1)", explanation: "返回A1的常用对数" },
  { id: "89", category: "条件判断", description: "返回整数部分", formula: "INT(A1)", explanation: "返回A1向下取整的整数" },
  { id: "90", category: "条件判断", description: "四舍五入", formula: "ROUND(A1, 2)", explanation: "返回A1保留2位小数的结果" },
  { id: "91", category: "条件判断", description: "向上取整", formula: "ROUNDUP(A1, 0)", explanation: "返回A1向上取整的结果" },
  { id: "92", category: "条件判断", description: "向下取整", formula: "ROUNDDOWN(A1, 0)", explanation: "返回A1向下取整的结果" },
  // 文本处理类 (38)
  { id: "93", category: "文本处理", description: "合并姓名和部门", formula: "A1&\"-\"&B1", explanation: "用短横线连接A1和B1" },
  { id: "94", category: "文本处理", description: "提取姓名(姓名 手机格式)", formula: "LEFT(A1, FIND(\" \", A1)-1)", explanation: "从\"姓名 手机号\"格式中提取姓名" },
  { id: "95", category: "文本处理", description: "提取手机号", formula: "RIGHT(A1, 11)", explanation: "从字符串右侧提取11位手机号" },
  { id: "96", category: "文本处理", description: "清除多余空格", formula: "TRIM(A1)", explanation: "删除A1中多余的空格" },
  { id: "97", category: "文本处理", description: "文本转大写", formula: "UPPER(A1)", explanation: "将A1的文本全部转为大写" },
  { id: "98", category: "文本处理", description: "文本转小写", formula: "LOWER(A1)", explanation: "将A1的文本全部转为小写" },
  { id: "99", category: "文本处理", description: "首字母大写", formula: "PROPER(A1)", explanation: "将A1每个单词首字母大写" },
  { id: "100", category: "文本处理", description: "统计字符数", formula: "LEN(A1)", explanation: "返回A1的字符个数" },
  { id: "101", category: "文本处理", description: "统计字节数(中文2字节)", formula: "LENB(A1)", explanation: "返回A1的字节数" },
  { id: "102", category: "文本处理", description: "替换文本内容", formula: "SUBSTITUTE(A1, \"旧\", \"新\")", explanation: "将A1中的\"旧\"替换为\"新\"" },
  { id: "103", category: "文本处理", description: "查找文本位置", formula: "FIND(\"关键词\", A1)", explanation: "返回\"关键词\"在A1中的起始位置" },
  { id: "104", category: "文本处理", description: "截取左侧字符", formula: "LEFT(A1, 5)", explanation: "返回A1左侧5个字符" },
  { id: "105", category: "文本处理", description: "截取右侧字符", formula: "RIGHT(A1, 5)", explanation: "返回A1右侧5个字符" },
  { id: "106", category: "文本处理", description: "截取中间字符", formula: "MID(A1, 3, 5)", explanation: "从A1第3个字符开始截取5个字符" },
  { id: "107", category: "文本处理", description: "在文本前后加内容", formula: "\"【\"&A1&\"】\"", explanation: "给A1前后加方括号" },
  { id: "108", category: "文本处理", description: "提取邮箱用户名", formula: "LEFT(A1, FIND(\"@\", A1)-1)", explanation: "从邮箱地址中提取用户名" },
  { id: "109", category: "文本处理", description: "提取邮箱域名", formula: "RIGHT(A1, LEN(A1)-FIND(\"@\", A1))", explanation: "从邮箱地址中提取域名" },
  { id: "110", category: "文本处理", description: "隐藏手机号中间4位", formula: "LEFT(A1, 3)&\"****\"&RIGHT(A1, 4)", explanation: "将手机号中间4位替换为*" },
  { id: "111", category: "文本处理", description: "身份证提取出生日期", formula: "TEXT(MID(A1, 7, 8), \"0000-00-00\")", explanation: "从身份证号提取出生年月日" },
  { id: "112", category: "文本处理", description: "身份证提取性别", formula: "IF(MOD(MID(A1, 17, 1), 2)=1, \"男\", \"女\")", explanation: "从身份证号第17位判断性别" },
  { id: "113", category: "文本处理", description: "清除不可见字符", formula: "CLEAN(A1)", explanation: "删除A1中的不可打印字符" },
  { id: "114", category: "文本处理", description: "重复显示文本N次", formula: "REPT(A1, 3)", explanation: "将A1的内容重复3次" },
  { id: "115", category: "文本处理", description: "提取不含扩展名的文件名", formula: "LEFT(A1, FIND(\".\", A1)-1)", explanation: "从文件名中提取不含扩展名的部分" },
  { id: "116", category: "文本处理", description: "提取文件扩展名", formula: "RIGHT(A1, LEN(A1)-FIND(\".\", A1))", explanation: "从文件名中提取扩展名" },
  { id: "117", category: "文本处理", description: "将数字转为大写金额", formula: "TEXT(A1, \"[dbnum2]0\")", explanation: "将数字转为中文大写" },
  { id: "118", category: "文本处理", description: "拼接多列文本", formula: "TEXTJOIN(\"-\", TRUE, A1, B1, C1)", explanation: "用短横线拼接A1、B1、C1的非空值" },
  { id: "119", category: "文本处理", description: "统计关键词出现次数", formula: "(LEN(A1)-LEN(SUBSTITUTE(A1, \"关键词\", \"\")))/LEN(\"关键词\")", explanation: "统计\"关键词\"出现次数" },
  { id: "120", category: "文本处理", description: "将首字母转为大写", formula: "UPPER(LEFT(A1, 1))&MID(A1, 2, LEN(A1))", explanation: "将A1首字母大写" },
  { id: "121", category: "文本处理", description: "判断是否为邮箱格式", formula: "IF(ISNUMBER(FIND(\"@\", A1)), \"邮箱\", \"非邮箱\")", explanation: "判断A1是否包含@符号" },
  { id: "122", category: "文本处理", description: "提取两个符号间文本", formula: "MID(A1, FIND(\"[\", A1)+1, FIND(\"]\", A1)-FIND(\"[\", A1)-1)", explanation: "提取[]内的内容" },
  { id: "123", category: "文本处理", description: "提取URL中的域名", formula: "IF(ISNUMBER(FIND(\"//\", A1)), MID(A1, FIND(\"//\", A1)+2, LEN(A1)), A1)", explanation: "从URL中提取域名" },
  { id: "124", category: "文本处理", description: "返回字符的ASCII码", formula: "CODE(A1)", explanation: "返回A1首字符的ASCII码" },
  { id: "125", category: "文本处理", description: "从ASCII码返回字符", formula: "CHAR(65)", explanation: "返回ASCII码65对应的字符(A)" },
  { id: "126", category: "文本处理", description: "将多行合并为一行", formula: "SUBSTITUTE(A1, CHAR(10), \" \")", explanation: "将换行符替换为空格" },
  { id: "127", category: "文本处理", description: "清除末尾句号", formula: "IF(RIGHT(A1)=\"。\", LEFT(A1, LEN(A1)-1), A1)", explanation: "删除A1末尾的句号" },
  { id: "128", category: "文本处理", description: "在文本中间插入字符", formula: "LEFT(A1, 3)&\"-\"&MID(A1, 4, LEN(A1))", explanation: "在A1第3个字符后插入-" },
  { id: "129", category: "文本处理", description: "将数字转为文本", formula: "TEXT(A1, \"0\")", explanation: "将A1数字转为文本格式" },
  { id: "130", category: "文本处理", description: "提取括号内文本", formula: "MID(A1, FIND(\"(\", A1)+1, FIND(\")\", A1)-FIND(\"(\", A1)-1)", explanation: "提取()内的内容" },
  // 日期计算类 (39)
  { id: "131", category: "日期计算", description: "计算年龄(周岁)", formula: "DATEDIF(A1, TODAY(), \"Y\")", explanation: "根据A1出生日期计算周岁" },
  { id: "132", category: "日期计算", description: "计算工龄(月份)", formula: "DATEDIF(A1, TODAY(), \"M\")", explanation: "计算A1到今天相差的月份" },
  { id: "133", category: "日期计算", description: "计算距目标日期天数", formula: "A1-TODAY()", explanation: "计算A1日期距今天还有多少天" },
  { id: "134", category: "日期计算", description: "返回月末日期", formula: "EOMONTH(A1, 0)", explanation: "返回A1所在月份的最后一天" },
  { id: "135", category: "日期计算", description: "返回月初日期", formula: "EOMONTH(A1, -1)+1", explanation: "返回A1所在月份的第一天" },
  { id: "136", category: "日期计算", description: "返回星期几(中文)", formula: "TEXT(A1, \"aaaa\")", explanation: "将A1转为\"星期一\"等中文星期" },
  { id: "137", category: "日期计算", description: "返回星期几(数字)", formula: "WEEKDAY(A1, 2)", explanation: "返回1-7(周一到周日)" },
  { id: "138", category: "日期计算", description: "判断是否周末", formula: "IF(WEEKDAY(A1, 2)>5, \"周末\", \"工作日\")", explanation: "周六周日为周末" },
  { id: "139", category: "日期计算", description: "计算工作日天数", formula: "NETWORKDAYS(A1, B1)", explanation: "计算A1到B1之间的工作日天数" },
  { id: "140", category: "日期计算", description: "计算完整天数", formula: "B1-A1", explanation: "返回两个日期相差的天数" },
  { id: "141", category: "日期计算", description: "提取月份", formula: "MONTH(A1)", explanation: "提取A1的月份数字" },
  { id: "142", category: "日期计算", description: "提取年份", formula: "YEAR(A1)", explanation: "提取A1的年份数字" },
  { id: "143", category: "日期计算", description: "返回季度", formula: "\"Q\"&ROUNDUP(MONTH(A1)/3, 0)", explanation: "返回A1所在季度" },
  { id: "144", category: "日期计算", description: "判断是否为闰年", formula: "IF(MOD(YEAR(A1), 4)=0, \"闰年\", \"平年\")", explanation: "年份能被4整除为闰年" },
  { id: "145", category: "日期计算", description: "将文本转为日期", formula: "DATEVALUE(\"2024-01-01\")", explanation: "将文本日期转为序列号" },
  { id: "146", category: "日期计算", description: "返回日期在年中周数", formula: "WEEKNUM(A1)", explanation: "返回A1在一年中的周数" },
  { id: "147", category: "日期计算", description: "判断是否在指定期间", formula: "IF(AND(A1>=B1, A1<=C1), \"在期间\", \"不在期间\")", explanation: "判断A1是否在B1到C1之间" },
  { id: "148", category: "日期计算", description: "返回指定月后日期", formula: "EDATE(A1, 6)", explanation: "返回A1加6个月后的日期" },
  { id: "149", category: "日期计算", description: "返回指定年后日期", formula: "EDATE(A1, 12)", explanation: "返回A1加12个月后的日期" },
  { id: "150", category: "日期计算", description: "返回距今天数", formula: "TODAY()-A1", explanation: "返回A1距今天多少天" },
  { id: "151", category: "日期计算", description: "提取小时", formula: "HOUR(A1)", explanation: "从A1(日期时间)中提取小时" },
  { id: "152", category: "日期计算", description: "提取分钟", formula: "MINUTE(A1)", explanation: "从A1(日期时间)中提取分钟" },
  { id: "153", category: "日期计算", description: "提取秒", formula: "SECOND(A1)", explanation: "从A1(日期时间)中提取秒" },
  { id: "154", category: "日期计算", description: "合并日期和时间", formula: "A1+B1", explanation: "A1为日期，B1为时间，合并为日期时间" },
  { id: "155", category: "日期计算", description: "提取纯日期", formula: "INT(A1)", explanation: "从日期时间中提取纯日期" },
  { id: "156", category: "日期计算", description: "提取纯时间", formula: "A1-INT(A1)", explanation: "从日期时间中提取纯时间" },
  { id: "157", category: "日期计算", description: "返回本周一日期", formula: "A1-WEEKDAY(A1, 2)+1", explanation: "返回A1所在周的周一日期" },
  { id: "158", category: "日期计算", description: "返回本月最后工作日", formula: "WORKDAY(EOMONTH(A1, 0)+1, -1)", explanation: "返回本月最后一个工作日" },
  { id: "159", category: "日期计算", description: "判断是否在本月", formula: "IF(MONTH(A1)=MONTH(TODAY()), \"当月\", \"\")", explanation: "判断A1是否在本月" },
  { id: "160", category: "日期计算", description: "返回指定天数后日期", formula: "A1+7", explanation: "返回A1加7天后的日期" },
  { id: "161", category: "日期计算", description: "判断是否3个月内到期", formula: "IF(A1>TODAY(), IF(A1-TODAY()<=90, \"即将到期\", \"\"), \"已过期\")", explanation: "判断是否在90天内到期" },
  { id: "162", category: "日期计算", description: "计算年龄(精确月)", formula: "DATEDIF(A1, TODAY(), \"Y\")&\"岁\"&DATEDIF(A1, TODAY(), \"YM\")&\"个月\"", explanation: "周岁加月份" },
  { id: "163", category: "日期计算", description: "返回下月同一天", formula: "DATE(YEAR(A1), MONTH(A1)+1, DAY(A1))", explanation: "返回A1下个月的同一天" },
  { id: "164", category: "日期计算", description: "返回所在月第几周", formula: "INT((DAY(A1)-1)/7)+1", explanation: "返回A1在当月的周序号" },
  { id: "165", category: "日期计算", description: "返回月历第一天星期", formula: "WEEKDAY(EOMONTH(A1, -1)+1, 2)", explanation: "返回本月1号是星期几" },
  { id: "166", category: "日期计算", description: "返回第N个工作日", formula: "WORKDAY(A1-1, N)", explanation: "返回A1之后第N个工作日" },
  { id: "167", category: "日期计算", description: "计算日期间月数差", formula: "DATEDIF(A1, B1, \"M\")", explanation: "返回A1到B1相差的月份" },
  { id: "168", category: "日期计算", description: "返回指定季末日期", formula: "DATE(YEAR(A1), INT((MONTH(A1)-1)/3)*3+3, 1)-1", explanation: "返回A1所在季度末日期" },
  { id: "169", category: "日期计算", description: "判断是否同一天", formula: "IF(A1=B1, \"同一天\", \"不同\")", explanation: "判断两个日期是否相同" },
  // 查找引用类 (28)
  { id: "170", category: "查找引用", description: "根据姓名查销售额", formula: "VLOOKUP(A1, B:C, 2, 0)", explanation: "在B:C区域查找A1对应第2列的值" },
  { id: "171", category: "查找引用", description: "双向查找", formula: "INDEX(B2:D10, MATCH(A1, A2:A10, 0), MATCH(B1, B1:D1, 0))", explanation: "INDEX+MATCH双向查找" },
  { id: "172", category: "查找引用", description: "从右向左查找", formula: "INDEX(B:B, MATCH(A1, C:C, 0))", explanation: "用INDEX+MATCH从右向左查找" },
  { id: "173", category: "查找引用", description: "返回最后一条记录", formula: "LOOKUP(2, 1/(A:A<>\"\"), B:B)", explanation: "返回A列最后非空对应的B列值" },
  { id: "174", category: "查找引用", description: "返回最大值对应名称", formula: "INDEX(A:A, MATCH(MAX(B:B), B:B, 0))", explanation: "返回B列最大值对应的A列" },
  { id: "175", category: "查找引用", description: "跨表查找", formula: "VLOOKUP(A1, Sheet2!A:B, 2, 0)", explanation: "在Sheet2的A:B区域查找A1" },
  { id: "176", category: "查找引用", description: "多条件查找", formula: "INDEX(C:C, MATCH(1, (A:A=A1)*(B:B=B1), 0))", explanation: "同时满足A=A1和B=B1的C列值" },
  { id: "177", category: "查找引用", description: "模糊查找(通配符)", formula: "VLOOKUP(\"*\"&A1&\"*\", B:C, 2, 0)", explanation: "包含A1的模糊匹配" },
  { id: "178", category: "查找引用", description: "返回位置序号", formula: "MATCH(A1, B:B, 0)", explanation: "返回A1在B列中的位置序号" },
  { id: "179", category: "查找引用", description: "返回区域中的第N行", formula: "INDEX(A:A, N)", explanation: "返回A列第N行的值" },
  { id: "180", category: "查找引用", description: "偏移引用", formula: "OFFSET(A1, 2, 3)", explanation: "返回A1向下2行向右3列的单元格" },
  { id: "181", category: "查找引用", description: "创建动态区域", formula: "OFFSET(A1, 0, 0, COUNTA(A:A), 1)", explanation: "创建A列的非空动态区域" },
  { id: "182", category: "查找引用", description: "返回区域行数", formula: "ROWS(A:A)", explanation: "返回A列的行数" },
  { id: "183", category: "查找引用", description: "返回区域列数", formula: "COLUMNS(A:C)", explanation: "返回A到C列的列数" },
  { id: "184", category: "查找引用", description: "转置区域", formula: "TRANSPOSE(A1:D1)", explanation: "将横向区域转为纵向" },
  { id: "185", category: "查找引用", description: "返回唯一值列表", formula: "UNIQUE(A:A)", explanation: "返回A列的所有唯一值(去重)" },
  { id: "186", category: "查找引用", description: "返回排序列表", formula: "SORT(A:A)", explanation: "返回A列升序排序后的结果" },
  { id: "187", category: "查找引用", description: "返回筛选列表", formula: "FILTER(A:A, B:B>100)", explanation: "返回B列>100对应的A列值" },
  { id: "188", category: "查找引用", description: "返回最后非空值", formula: "INDEX(A:A, COUNTA(A:A))", explanation: "返回A列最后一个非空值" },
  { id: "189", category: "查找引用", description: "返回第N个匹配值", formula: "INDEX(B:B, AGGREGATE(15, 6, ROW($2:$100)/(A$2:A$100=D1), 1))", explanation: "返回第N个匹配" },
  { id: "190", category: "查找引用", description: "返回列标题", formula: "INDEX(1:1, MATCH(MAX(A:A), A:A, 0))", explanation: "返回最大值所在列的标题" },
  { id: "191", category: "查找引用", description: "水平查找HLOOKUP", formula: "HLOOKUP(A1, 1:3, 2, 0)", explanation: "在第1到3行区域查找并返回第2行" },
  { id: "192", category: "查找引用", description: "返回动态引用", formula: "INDEX(A:A, ROW()-1)", explanation: "取上一行" },
  { id: "193", category: "查找引用", description: "SUMIF条件汇总", formula: "SUMIF(B:B, \"销售一部\", C:C)", explanation: "B列=销售一部的C列求和" },
  { id: "194", category: "查找引用", description: "多级下拉数据源", formula: "OFFSET(Sheet2!$A$1, 0, 0, COUNTA(Sheet2!A:A), 1)", explanation: "创建动态下拉数据源" },
  { id: "195", category: "查找引用", description: "查找最接近的值", formula: "INDEX(B:B, MATCH(MIN(ABS(A:A-C1)), ABS(A:A-C1), 0))", explanation: "查找最接近C1的值" },
  { id: "196", category: "查找引用", description: "返回随机样本", formula: "INDEX(A:A, RANDARRAY(5, 1, 1, COUNTA(A:A), TRUE))", explanation: "随机抽取5个值" },
  { id: "197", category: "查找引用", description: "反向查找(从右向左)", formula: "INDEX(A:A, MATCH(MAX(B:B), B:B, 0))", explanation: "返回B列最大值对应的A列" },
  // 财务金融类 (16)
  { id: "198", category: "财务金融", description: "计算等额本息月供", formula: "PMT(B1/12, C1*12, A1)", explanation: "B1=年利率，C1=贷款年限，A1=本金" },
  { id: "199", category: "财务金融", description: "计算复利终值", formula: "A1*(1+B1)^C1", explanation: "A1=本金，B1=年利率，C1=年数" },
  { id: "200", category: "财务金融", description: "计算单利终值", formula: "A1*(1+B1*C1)", explanation: "A1=本金，B1=年利率，C1=年数" },
  { id: "201", category: "财务金融", description: "计算内部收益率IRR", formula: "IRR(A1:A10)", explanation: "计算A1:A10现金流的IRR" },
  { id: "202", category: "财务金融", description: "计算净现值NPV", formula: "NPV(B1, A2:A10)-A1", explanation: "B1=折现率，计算NPV" },
  { id: "203", category: "财务金融", description: "计算投资回报率ROI", formula: "(B1-A1)/A1", explanation: "B1=收益，A1=成本，计算ROI" },
  { id: "204", category: "财务金融", description: "计算直线折旧额", formula: "(A1-B1)/C1", explanation: "A1=原值，B1=残值，C1=使用年限" },
  { id: "205", category: "财务金融", description: "计算定期存款利息", formula: "A1*B1/100*C2/365", explanation: "A1=本金，B1=年利率，C2=存期天数" },
  { id: "206", category: "财务金融", description: "计算毛利率", formula: "(A1-B1)/A1", explanation: "A1=收入，B1=成本，计算毛利率" },
  { id: "207", category: "财务金融", description: "计算净利率", formula: "(A1-B1)/A1", explanation: "净收入/总收入" },
  { id: "208", category: "财务金融", description: "计算资产负债率", formula: "A1/B1", explanation: "负债总额/资产总额" },
  { id: "209", category: "财务金融", description: "计算流动比率", formula: "A1/B1", explanation: "流动资产/流动负债" },
  { id: "210", category: "财务金融", description: "计算速动比率", formula: "(A1-B1)/C1", explanation: "速动资产/流动负债" },
  { id: "211", category: "财务金融", description: "计算未来值FV", formula: "FV(B1/12, C1*12, -A1)", explanation: "定期投资的未来值" },
  { id: "212", category: "财务金融", description: "计算现值PV", formula: "PV(B1/12, C1*12, A1)", explanation: "未来现金流折现到现在的值" },
  { id: "213", category: "财务金融", description: "计算已付利息总额", formula: "CUMIPMT(B1/12, C1*12, A1, 1, D1, 0)", explanation: "计算1到D1期支付的利息总额" },
  { id: "214", category: "财务金融", description: "计算已还本金总额", formula: "CUMPRINC(B1/12, C1*12, A1, 1, D1, 0)", explanation: "计算1到D1期偿还的本金总额" },
];

// 全部分类标签
const ALL_CATEGORIES = [
  { id: '全部', label: '全部', color: 'bg-primary/10 text-primary border-primary/20' },
  { id: '数据统计', label: '数据统计', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { id: '条件判断', label: '条件判断', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { id: '文本处理', label: '文本处理', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { id: '日期计算', label: '日期计算', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { id: '查找引用', label: '查找引用', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { id: '财务金融', label: '财务金融', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
];

export function AIFormulaGenerator({ data, modelConfig, onApplyFormula }: AIFormulaGeneratorProps) {
  const { t } = useI18n();
  const [requirement, setRequirement] = useState('');
  const [generatedFormula, setGeneratedFormula] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetColumn, setTargetColumn] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的公式列表
  const filteredExamples = useMemo(() => {
    let result = activeCategory === '全部' ? FORMULA_EXAMPLES : FORMULA_EXAMPLES.filter(e => e.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.formula.toLowerCase().includes(q) ||
        e.explanation.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    if (!modelConfig) {
      setError('请先配置AI模型');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedFormula('');
    setExplanation('');

    try {
      const response = await fetch('/api/ai-formula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({
          requirement: requirement.trim(),
          headers: data.headers,
          sampleRows: data.rows.slice(0, 3),
          modelConfig,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      const result = await response.json();
      if (result.success) {
        setGeneratedFormula(result.data.formula);
        setExplanation(result.data.explanation);
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedFormula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!targetColumn.trim()) return;
    onApplyFormula?.(generatedFormula, targetColumn.trim());
    setShowApplyDialog(false);
    setTargetColumn('');
  };

  const handleExampleClick = (example: FormulaExample) => {
    setGeneratedFormula('=' + example.formula);
    setExplanation(example.explanation);
  };

  const handleCopyExample = (e: React.MouseEvent, formula: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText('=' + formula);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            智能公式
          </h3>
          <p className="text-sm text-muted-foreground">
            用自然语言描述需求，AI自动生成标准表格公式 · 共214+公式案例
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="generate" className="flex-1">
            <Wand2 className="w-3.5 h-3.5 mr-1" />
            AI生成
          </TabsTrigger>
          <TabsTrigger value="library" className="flex-1">
            <Lightbulb className="w-3.5 h-3.5 mr-1" />
            公式库
          </TabsTrigger>
        </TabsList>

        {/* AI生成 */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  描述你的计算需求
                </label>
                <Textarea
                  value={requirement}
                  onChange={e => setRequirement(e.target.value)}
                  placeholder={t("ph.例如统计A列中状态为已完成的记录数如果销售额大于1")}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                可用列：{data.headers.join('、')}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading || !requirement.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在生成公式...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成公式
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedFormula && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    生成的公式
                  </h4>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="p-3 bg-background rounded-md font-mono text-sm border">
                  {generatedFormula}
                </div>

                {explanation && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">{t('txt.公式解释')}</h5>
                    <p className="text-sm">{explanation}</p>
                  </div>
                )}

                <Button
                  onClick={() => setShowApplyDialog(true)}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  采纳并应用
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 公式库 - 合并后的统一列表 */}
        <TabsContent value="library" className="space-y-3">
          {/* 搜索框 */}
          <Input
            placeholder={t("ph.搜索公式名称公式或说明")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  activeCategory === cat.id
                    ? cat.color
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                )}
              >
                {cat.label}
                {cat.id === '全部' && <span className="ml-1 opacity-60">({FORMULA_EXAMPLES.length})</span>}
                {cat.id !== '全部' && (
                  <span className="ml-1 opacity-60">
                    ({FORMULA_EXAMPLES.filter(e => e.category === cat.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 结果统计 */}
          <div className="text-xs text-muted-foreground px-1">
            共 {filteredExamples.length} 个公式
          </div>

          {/* 公式列表 */}
          <ScrollArea className="h-[450px]">
            <div className="space-y-2 pr-2">
              {filteredExamples.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('txt.未找到匹配的公式')}</p>
                </div>
              ) : (
                filteredExamples.map(example => (
                  <Card
                    key={example.id}
                    className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => handleExampleClick(example)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-xs font-medium',
                            ALL_CATEGORIES.find(c => c.id === example.category)?.color || ''
                          )}>
                            {example.category}
                          </span>
                          <p className="text-sm font-medium leading-snug">{example.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={e => handleCopyExample(e, example.formula)}
                          title="复制公式"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="p-2 bg-muted/60 rounded font-mono text-xs text-foreground/80 overflow-x-auto">
                        ={example.formula}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{example.explanation}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* 应用对话框 */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('txt.应用公式')}</DialogTitle>
            <DialogDescription>
              选择要应用公式的目标列
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('txt.公式')}</label>
              <div className="p-2 bg-muted rounded font-mono text-sm mt-1">
                {generatedFormula}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('txt.目标列')}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.headers.map(header => (
                  <button
                    key={header}
                    onClick={() => setTargetColumn(header)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm border transition-colors',
                      targetColumn === header
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    {header}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              取消
            </Button>
            <Button onClick={handleApply} disabled={!targetColumn.trim()}>
              确认应用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
