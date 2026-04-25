import { SearchClient, Config } from "coze-coding-dev-sdk";

const config = new Config();
const client = new SearchClient(config);

// 搜索 BI 指标语义层最佳实践
const metricLayerResearch = async () => {
  console.log("=== 搜索 BI 指标语义层最佳实践 ===\n");
  
  const queries = [
    "Metabase custom expression metric definition best practice",
    "Cube.dev指标平台 semantic layer design",
    "Looker LookML metrics definition pattern",
    "BI data quality check best practices",
    "Metabase pulse alerting configuration"
  ];
  
  for (const query of queries) {
    console.log(`\n查询: ${query}`);
    console.log("-".repeat(60));
    
    try {
      const response = await client.webSearch(query, 3, true);
      
      if (response.web_items && response.web_items.length > 0) {
        for (const item of response.web_items) {
          console.log(`\n标题: ${item.title}`);
          console.log(`链接: ${item.url}`);
          if (item.snippet) {
            console.log(`摘要: ${item.snippet}`);
          }
        }
      }
    } catch (error) {
      console.log(`搜索失败: ${error}`);
    }
  }
};

metricLayerResearch().catch(console.error);
