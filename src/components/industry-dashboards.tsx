'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CellValue } from '@/lib/data-processor';

// 20+ industries × 10+ scenario templates = 200+ industry dashboard templates

const THEME_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
];

const DARK_BG = '#0d1b2a';
const DARK_CARD = '#1b2838';
const DARK_TEXT = '#e0e6ed';
const DARK_SUBTEXT = '#8aa4bf';

interface ChartTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface IndustryConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
  templates: ChartTemplate[];
}

// 20+ industry configs, 10+ scenario templates per industry
export const INDUSTRY_CONFIGS: IndustryConfig[] = [
  // ===== Retail E-commerce =====
  {
    id: 'retail',
    name: 'Retail E-commerce',
    icon: '🛒',
    description: 'In-store Sales, E-commerce Operation, Inventory Management',
    keywords: ['retail, retailer, store, shop, Physical Stores', 'Retail', 'E-commerce', 'Merchandise', 'Sales', 'sales'],
    templates: [
      { id: 'retail-sales-trend', name: 'Sales Trend Analysis', category: 'Sales Analysis', description: 'Daily/Weekly/Monthly Sales Trend and Sequential Comparison Analysis' },
      { id: 'retail-category-pie', name: 'Category Share Analysis', category: 'Category Analysis', description: 'Sales Share and Ranking by Category' },
      { id: 'retail-channel-bar', name: 'Channel Comparison Analysis', category: 'Channel Analysis', description: 'Multi-channel Sales Comparison: Online vs Offline' },
      { id: 'retail-region-heatmap', name: 'Regional Heatmap Analysis', category: 'Regional Analysis', description: 'Sales Heatmap by Region' },
      { id: 'retail-inventory-radar', name: 'Inventory Health Analysis', category: 'Inventory Analysis', description: 'SKU Turnover and Inventory Alert' },
      { id: 'retail-customer-rfm', name: 'Customer RFM Analysis', category: 'Customer Analysis', description: 'Customer Value Analysis with RFM Model' },
      { id: 'retail-conversion-funnel', name: 'Conversion Funnel Analysis', category: 'Conversion Analysis', description: 'Full Funnel: Browse - Add to Cart - Place Order - Payment' },
      { id: 'retail-product-top', name: 'Top-selling Product Ranking', category: 'Product Analysis', description: 'TOP Product Sales and GMV Ranking' },
      { id: 'retail-promotion-effect', name: 'Promotion Effectiveness Analysis', category: 'Promotion Analysis', description: 'Campaign ROI and Promotion Utilization Rate' },
      { id: 'retail-hourly-heatmap', name: 'Hourly Sales Analysis', category: 'Time Period Analysis', description: 'Sales Distribution by Hour of Day' },
      { id: 'retail-margins-scatter', name: 'Gross Margin Scatter Analysis', category: 'Profit Analysis', description: 'Relationship Between Sales Revenue and Gross Margin' },
      { id: 'retail-repurchase-line', name: 'Repurchase Rate Analysis', category: 'Customer Analysis', description: 'Customer Repurchase Cycle and Frequency' },
    ],
  },
  // ===== Finance and Insurance =====
  {
    id: 'finance',
    name: 'Finance and Insurance',
    icon: '🏦',
    description: 'Banking & Securities, Insurance & Wealth Management, Investment Management',
    keywords: ['finance, bank, insurance, investment, Finance', 'Bank', 'Insurance', 'Wealth Management', 'Investment', 'Fund', 'Securities'],
    templates: [
      { id: 'finance-income-bar', name: 'Income and Expenditure Analysis', category: 'Financial Analysis', description: 'Monthly Income and Expenditure Comparison and Trend' },
      { id: 'finance-profit-line', name: 'Profit Trend Analysis', category: 'Financial Analysis', description: 'Net Profit Trend and Year-on-year Analysis' },
      { id: 'finance-cost-breakdown', name: 'Cost Structure Analysis', category: 'Cost Analysis', description: 'Proportion and Change of Various Costs' },
      { id: 'Cash Flow Analysis', name: 'Cash Flow Analysis', category: 'Capital Analysis', description: 'Cash Flow from Operating/Investing/Financing Activities' },
      { id: 'Asset Allocation Analysis', name: 'Asset Allocation Analysis', category: 'Assets and Liabilities', description: 'Asset Structure Distribution and Proportion' },
      { id: 'Debt Ratio Analysis', name: 'Debt Ratio Analysis', category: 'Assets and Liabilities', description: 'Change Trend of Asset-Liability Ratio' },
      { id: 'Profitability Analysis', name: 'Profitability Analysis', category: 'Profitability Analysis', description: 'ROA/ROE Indicator Tracking' },
      { id: 'finance-npl-funnel', name: 'Non-performing Loan Analysis', category: 'Risk Management', description: 'Non-performing Rate Change and Collection Effectiveness' },
      { id: 'finance-deposit-trend', name: 'Deposit Growth Analysis', category: 'Liability Analysis', description: 'Savings Deposit Growth and Structure' },
      { id: 'finance-loan-sector', name: 'Loan Sector Distribution', category: 'Loan Analysis', description: 'Loan Exposure Distribution by Industry' },
      { id: 'finance-insurance-claims', name: 'Claims Settlement Analysis', category: 'Insurance Analysis', description: 'Claim Ratio and Claim Settlement Turnaround Time' },
      { id: 'finance-premium-trend', name: 'Premium Revenue Analysis', category: 'Insurance Analysis', description: 'Premium Growth and Achievement Rate' },
    ],
  },
  // ===== Education and Training =====
  {
    id: 'education',
    name: 'Education and Training',
    icon: '📚',
    description: 'K12, Higher Education, Vocational Education',
    keywords: ['education, school, student, course, Education', 'School', 'Student', 'Course', 'Training', 'Trainee', 'Teacher'],
    templates: [
      { id: 'edu-score-distribution', name: 'Score Distribution Analysis', category: 'Academic Performance Analysis', description: 'Population Distribution by Score Range' },
      { id: 'Outstanding Student Ranking', name: 'Outstanding Student Ranking', category: 'Academic Performance Analysis', description: 'TOP Student Score Ranking' },
      { id: 'Attendance Rate Analysis', name: 'Attendance Rate Analysis', category: 'Attendance Analysis', description: 'Class/Individual Attendance Statistics' },
      { id: 'Subject Comparison Analysis', name: 'Subject Comparison Analysis', category: 'Academic Performance Analysis', description: 'Radar Chart of Average Score by Subject' },
      { id: 'Class Comparison Analysis', name: 'Class Comparison Analysis', category: 'Class Analysis', description: 'Class Average Score and Ranking' },
      { id: 'Course Enrollment Analysis', name: 'Course Enrollment Analysis', category: 'Course Analysis', description: 'Course Enrollment and Satisfaction' },
      { id: 'Teacher Evaluation Analysis', name: 'Teacher Evaluation Analysis', category: 'Teacher Analysis', description: 'Teaching Quality Score Distribution' },
      { id: 'edu-enrollment-trend', name: 'Enrollment Trend Analysis', category: 'Enrollment Analysis', description: 'Enrollment Plan and Completion Rate' },
      { id: 'Tuition Revenue Analysis', name: 'Tuition Revenue Analysis', category: 'Revenue Analysis', description: 'Tuition Revenue Proportion by Grade' },
      { id: 'Renewal Rate Analysis', name: 'Renewal Rate Analysis', category: 'Operational Analysis', description: 'Student Renewal and Retention Analysis' },
      { id: 'edu-homework-completion', name: 'Homework Completion Analysis', category: 'Academic Performance Analysis', description: 'Assignment Submission and Completion Rate' },
      { id: 'edu-exam-paper-analysis', name: 'Exam Paper Analysis', category: 'Academic Performance Analysis', description: 'Difficulty Coefficient and Discrimination' },
    ],
  },
  // ===== Healthcare =====
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    description: 'Hospitals & Clinics, Pharmaceutical E-commerce, Health Management',
    keywords: ['hospital, medical, health, patient, Healthcare', 'Hospital', 'Patient', 'Outpatient', 'Inpatient', 'Prescription', 'Pharmaceutical'],
    templates: [
      { id: 'health-outpatient-trend', name: 'Outpatient Volume Trend', category: 'Outpatient Analysis', description: 'Daily/Weekly/Monthly Outpatient Volume Change' },
      { id: 'health-department-pie', name: 'Department Distribution Analysis', category: 'Department Analysis', description: 'Outpatient Share by Department' },
      { id: 'health-diagnosis-bar', name: 'Disease Spectrum Analysis', category: 'Disease Analysis', description: 'High-Incidence Disease Ranking and Trend' },
      { id: 'Pharmaceutical Sales Analysis', name: 'Pharmaceutical Sales Analysis', category: 'Drug Analysis', description: 'Drug Sales Volume and Revenue' },
      { id: 'Bed Utilization Analysis', name: 'Bed Utilization Analysis', category: 'Inpatient Analysis', description: 'Bed Turnover and Occupancy Rate' },
      { id: 'health-mountain-stack', name: 'Revenue Composition Analysis', category: 'Revenue Analysis', description: 'Revenue Share of Examination/Treatment/Pharmaceuticals' },
      { id: 'health-revisit-rate', name: 'Revisit Rate Analysis', category: 'Patient Analysis', description: 'Patient Return Visit Cycle Analysis' },
      { id: 'Waiting Time Analysis', name: 'Waiting Time Analysis', category: 'Efficiency Analysis', description: 'Waiting Time for Registration/Queuing/Pickup' },
      { id: 'health-insurance-claim', name: 'Medical Insurance Reimbursement Analysis', category: 'Medical Insurance Analysis', description: 'Medical Insurance Settlement and Out-of-Pocket Ratio' },
      { id: 'Patient Age Analysis', name: 'Patient Age Analysis', category: 'Patient Analysis', description: 'Patient Age Distribution' },
      { id: 'health-surgery-count', name: 'Surgery Volume Analysis', category: 'Surgery Analysis', description: 'Surgery Type and Case Count Statistics' },
      { id: 'Drug Cost Ratio Analysis', name: 'Drug Cost Ratio Analysis', category: 'Rational Drug Use', description: 'Drug Revenue Proportion Control' },
    ],
  },
  // ===== Manufacturing =====
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: '🏭',
    description: 'Manufacturing, Supply Chain, Quality Management',
    keywords: ['manufacturing, factory, production, manufacture, Manufacturing', 'Production', 'Factory', 'Workshop', 'Process', 'Quality'],
    templates: [
      { id: 'Output Trend Analysis', name: 'Output Trend Analysis', category: 'Production Analysis', description: 'Daily/Shift/Monthly Output Change' },
      { id: 'mfg-quality-pareto', name: 'Quality Pareto Analysis', category: 'Quality Analysis', description: 'NPL Type Distribution and TOP Causes' },
      { id: 'mfg-oee-dashboard', name: 'OEE Equipment Efficiency', category: 'Equipment Analysis', description: 'Overall Equipment Effectiveness Analysis' },
      { id: 'Capacity Utilization Analysis', name: 'Capacity Utilization Analysis', category: 'Capacity Analysis', description: 'Production Line/Workshop Capacity Utilization' },
      { id: 'mfg-inventory-turn', name: 'Inventory Turnover Analysis', category: 'Inventory Analysis', description: 'Raw Material/Finished Goods Turnover Days' },
      { id: 'mfg-cost-breakdown', name: 'Production Cost Analysis', category: 'Cost Analysis', description: 'Materials/Labor/Manufacturing Overhead' },
      { id: 'On-Time Delivery Rate', name: 'On-Time Delivery Rate', category: 'Delivery Analysis', description: 'Order Delivery Trend and Fulfillment' },
      { id: 'mfg-energy-consumption', name: 'Energy Consumption Analysis', category: 'Energy Consumption Analysis', description: 'Unit Consumption Tracking of Water, Electricity, Heat and Gas' },
      { id: 'mfg-defect-scatter', name: 'Defect Scatter Analysis', category: 'Quality Analysis', description: 'Relationship Between Defect Count and Cost' },
      { id: 'Shift Comparison Analysis', name: 'Shift Comparison Analysis', category: 'Production Analysis', description: 'Efficiency Comparison of Morning, Midday and Night Shifts' },
      { id: 'mfg-scrap-rate', name: 'Scrap Rate Analysis', category: 'Quality Analysis', description: 'Material Scrap Rate Tracking' },
      { id: 'mfg-lead-time', name: 'Production Lead Time Analysis', category: 'Efficiency Analysis', description: 'Cycle Time by Process' },
    ],
  },
  // ===== Logistics and Transportation =====
  {
    id: 'logistics',
    name: 'Logistics and Transportation',
    icon: '🚚',
    description: 'Express & Freight Delivery, Warehousing & Distribution, Transportation Scheduling',
    keywords: ['logistics, delivery, shipping, warehouse, Logistics', 'Express Delivery', 'Transportation', 'Distribution', 'Warehousing', 'Cargo'],
    templates: [
      { id: 'logistics-volume-trend', name: 'Business Volume Trend', category: 'Business Analysis', description: 'Daily/Weekly/Monthly Shipment Volume Change' },
      { id: 'logistics-on-time-rate', name: 'On-Time Delivery Analysis', category: 'Timeliness Analysis', description: 'On-Time Delivery Rate and Trend' },
      { id: 'Route Analysis', name: 'Route Analysis', category: 'Route Analysis', description: 'Business Volume Comparison by Route' },
      { id: 'logistics-warehouse-pie', name: 'Warehouse Distribution Analysis', category: 'Warehouse Analysis', description: 'Throughput Proportion by Warehouse' },
      { id: 'logistics-cost-per-order', name: 'Cost Per Shipment Analysis', category: 'Cost Analysis', description: 'Cost per Shipment and Composition' },
      { id: 'logistics-vehicle-util', name: 'Vehicle Utilization Rate', category: 'Transport Capacity Analysis', description: 'Vehicle Loading Rate and Mileage Utilization' },
      { id: 'logistics-complaint-funnel', name: 'Complaint Analysis', category: 'Service Analysis', description: 'Complaint Type and Processing Turnaround Time' },
      { id: 'logistics-peak-heatmap', name: 'Peak and Off-Peak Period Analysis', category: 'Time Period Analysis', description: 'Peak-Valley Distribution of Business Volume' },
      { id: 'logistics-loss-damage', name: 'Cargo Loss and Damage Analysis', category: 'Quality Analysis', description: 'Damage Rate and Claim Analysis' },
      { id: 'logistics-distance-cost', name: 'Mileage Cost Analysis', category: 'Cost Analysis', description: 'Relationship Between Mileage and Transportation Cost' },
      { id: 'logistics-network-map', name: 'Network Coverage Analysis', category: 'Network Analysis', description: 'Outlet Coverage and Density' },
      { id: 'logistics-wait-loading', name: 'Loading/Unloading Waiting Time Analysis', category: 'Efficiency Analysis', description: 'Vehicle Waiting and Loading/Unloading Duration' },
    ],
  },
  // ===== Catering Chain =====
  {
    id: 'restaurant',
    name: 'Catering Chain',
    icon: '🍜',
    description: 'Restaurants & Hotels, Fast Food Chains, Bubble Tea & Desserts',
    keywords: ['restaurant, catering, food, restaurant, Catering', 'Restaurant', 'Hotel', 'Fast Food', 'Dishes', 'Physical Store'],
    templates: [
      { id: 'Revenue Trend Analysis', name: 'Revenue Trend Analysis', category: 'Operating Revenue Analysis', description: 'Daily/Weekly/Monthly Turnover Change' },
      { id: 'rest-dish-top', name: 'Dish Sales Ranking', category: 'Menu Item Analysis', description: 'TOP Dish Sales and Gross Profit' },
      { id: 'Peak-Valley Time Period Analysis', name: 'Peak-Valley Time Period Analysis', category: 'Time Period Analysis', description: 'Passenger Flow Distribution by Time Period' },
      { id: 'Table Utilization Analysis', name: 'Table Utilization Analysis', category: 'Operational Analysis', description: 'Table Turnover Rate and Table Utilization Rate' },
      { id: 'Cost Proportion Analysis', name: 'Cost Proportion Analysis', category: 'Cost Analysis', description: 'Cost Share of Ingredients/Labor/Rent' },
      { id: 'rest-store-compare', name: 'Store Comparison Analysis', category: 'Store Analysis', description: 'Store Performance Ranking' },
      { id: 'rest-customer-segment', name: 'Customer Segmentation Analysis', category: 'Customer Analysis', description: 'Average Transaction Value and Consumption Frequency' },
      { id: 'Channel Distribution Analysis', name: 'Channel Distribution Analysis', category: 'Channel Analysis', description: 'Dine-in/Takeaway/Group Order Share' },
      { id: 'rest-inventory-alert', name: 'Raw Material Warning Analysis', category: 'Inventory Analysis', description: 'Raw Material Inventory and Alert' },
      { id: 'rest-new-product', name: 'New Product Analysis', category: 'Menu Item Analysis', description: 'New Product Sales Volume and Repurchase Rate' },
      { id: 'rest-staff-productivity', name: 'Labor Productivity Analysis', category: 'Labor Productivity Analysis', description: 'Per Capita Service and Output' },
      { id: 'Positive Review Rate Analysis', name: 'Positive Review Rate Analysis', category: 'Reputation Analysis', description: 'Rating and Trend by Platform' },
    ],
  },
  // ===== Travel and Mobility =====
  {
    id: 'tourism',
    name: 'Travel and Mobility',
    icon: '✈️',
    description: 'Hotels & Homestays, Scenic Spots & Parks, Travel Agencies',
    keywords: ['tourism, hotel, travel, booking, Tourism', 'Hotel', 'Scenic Area', 'Homestay', 'Ticket', 'Reservation'],
    templates: [
      { id: 'tourism-booking-trend', name: 'Booking Trend Analysis', category: 'Booking Analysis', description: 'Daily/Weekly/Monthly Reservation Volume Change' },
      { id: 'tourism-occupancy-rate', name: 'Occupancy Rate Analysis', category: 'Operational Analysis', description: 'Room Occupancy Rate and Trend' },
      { id: 'tourism-revenue-per-room', name: 'Revenue Per Available Room Analysis', category: 'Yield Analysis', description: 'RevPAR Indicator Tracking' },
      { id: 'tourism-source-region', name: 'Tourist Origin Analysis', category: 'Customer Analysis', description: 'Tourist Origin Distribution by Province/City' },
      { id: 'tourism-weather-impact', name: 'Weather Impact Analysis', category: 'External Analysis', description: 'Correlation Between Weather and Customer Flow' },
      { id: 'tourism-ticket-top', name: 'Attraction Ranking Analysis', category: 'Attraction Analysis', description: 'Visitor Volume Ranking by Attraction' },
      { id: 'tourism-package-pie', name: 'Package Sales Analysis', category: 'Product Analysis', description: 'Sales Share by Plan' },
      { id: 'tourism-channel-bar', name: 'Channel Comparison Analysis', category: 'Channel Analysis', description: 'OTA/Official Website/Distribution Share' },
      { id: 'Average Length of Stay', name: 'Average Length of Stay', category: 'Operational Analysis', description: 'Average Guest Stay Duration' },
      { id: 'tourism-price-trend', name: 'Price Trend Analysis', category: 'Pricing Analysis', description: 'Average Price and Supply-Demand Relationship' },
      { id: 'tourism-group-vs-retail', name: 'Group vs. FIT Comparison Analysis', category: 'Customer Analysis', description: 'Share of Group vs. FIT Guests' },
      { id: 'tourism-seasonality', name: 'Seasonality Analysis', category: 'Cycle Analysis', description: 'Fluctuation Pattern of Peak and Off Seasons' },
    ],
  },
  // ===== Real Estate and Construction =====
  {
    id: 'realestate',
    name: 'Real Estate and Construction',
    icon: '🏗️',
    description: 'Real Estate Development, Property Management, Construction Engineering',
    keywords: ['real estate, property, building, estate, Real Estate', 'Real Estate', 'Property Management', 'Construction', 'Real Estate Development', 'Construction'],
    templates: [
      { id: 're-sales-trend', name: 'Sales Trend Analysis', category: 'Sales Analysis', description: 'Subscription/Signing/Payment Collection Trend' },
      { id: 'Inventory Depletion Analysis', name: 'Inventory Depletion Analysis', category: 'Inventory Analysis', description: 'Inventory Unit Count and Depletion Cycle' },
      { id: 're-price-map', name: 'Price Map Analysis', category: 'Pricing Analysis', description: 'Competitor Price Comparison Distribution' },
      { id: 're-project-progress', name: 'Project Progress Analysis', category: 'Progress Analysis', description: 'Project Schedule Tracking' },
      { id: 'Property Fee Collection Analysis', name: 'Property Fee Collection Analysis', category: 'Property Management Analysis', description: 'Collection Rate and Arrears Analysis' },
      { id: 're-complaint-categories', name: 'Complaint Category Analysis', category: 'Property Management Analysis', description: 'Complaint Type and Processing Turnaround Time' },
      { id: 're-area-sold', name: 'Transaction Area Analysis', category: 'Sales Analysis', description: 'Transaction Share by Area Segment' },
      { id: 'Customer Age Analysis', name: 'Customer Age Analysis', category: 'Customer Analysis', description: 'Age Distribution of Home Buyers' },
      { id: 'Payment Method Analysis', name: 'Payment Method Analysis', category: 'Transaction Analysis', description: 'Proportion of One-shot/Commercial Provident Fund Loans' },
      { id: 're-site-safety', name: 'Safety Inspection Analysis', category: 'Safety Analysis', description: 'Hidden Hazard Rectification and Safety Score' },
      { id: 'Material Cost Analysis', name: 'Material Cost Analysis', category: 'Cost Analysis', description: 'Main Material Consumption and Price' },
      { id: 're-labor-productivity', name: 'Labor Efficiency Analysis', category: 'Labor Productivity Analysis', description: 'Per Capita Output and Work Efficiency' },
    ],
  },
  // ===== Media and Entertainment =====
  {
    id: 'media',
    name: 'Media and Entertainment',
    icon: '🎬',
    description: 'Film & Television Production, Content Platforms, Performance & Sports Events',
    keywords: ['media, entertainment, content, video, Media', 'Film and Television', 'Video', 'Content', 'Box Office', 'Play Count'],
    templates: [
      { id: 'Viewing Trend Analysis', name: 'Viewing Trend Analysis', category: 'Content Analysis', description: 'Daily/Weekly Play Volume Change' },
      { id: 'Content Ranking Analysis', name: 'Content Ranking Analysis', category: 'Content Analysis', description: 'TOP Content Playback Ranking' },
      { id: 'media-engagement-bar', name: 'Engagement Data Analysis', category: 'Interaction Analysis', description: 'Likes/Comments/Reposts Count' },
      { id: 'media-retention-curve', name: 'Retention Curve Analysis', category: 'User Analysis', description: 'Next-day/7-day/30-day Retention' },
      { id: 'media-watch-duration', name: 'Watch Duration Analysis', category: 'Content Analysis', description: 'Distribution of Per Capita Viewing Duration' },
      { id: 'media-user-portrait', name: 'User Portrait Analysis', category: 'User Analysis', description: 'Gender/Age/Geographic Distribution' },
      { id: 'Advertising Revenue Analysis', name: 'Advertising Revenue Analysis', category: 'Revenue Analysis', description: 'Ad Impression and Click Revenue' },
      { id: 'media-box-office', name: 'Box Office Analysis', category: 'Box Office Analysis', description: 'Box Office and Screening Rate' },
      { id: 'media-vip-conversion', name: 'VIP Conversion Analysis', category: 'Conversion Analysis', description: 'Free-to-Paid Conversion Rate' },
      { id: 'Push Effect Analysis', name: 'Push Effect Analysis', category: 'Operational Analysis', description: 'Push Open Rate and Conversion' },
      { id: 'Hot Topic Analysis', name: 'Hot Topic Analysis', category: 'Public Opinion Analysis', description: 'Topic Heat and Engagement' },
      { id: 'Creator Ranking', name: 'Creator Ranking', category: 'Creator Analysis', description: 'TOP Creator Contribution' },
    ],
  },
  // ===== Telecommunication Operator =====
  {
    id: 'telecom',
    name: 'Telecommunication Operator',
    icon: '📡',
    description: 'Mobile Communication, Broadband Access, Value-added Services',
    keywords: ['telecom', 'mobile', 'broadband', 'Carrier', 'Telecommunications', 'Mobile Phone', 'Broadband', 'Data Traffic', 'Plan', 'User'],
    templates: [
      { id: 'telecom-user-trend', name: 'User Growth Trend', category: 'User Analysis', description: 'Net User Growth and Churn Rate' },
      { id: 'telecom-arpu-line', name: 'ARPU Trend Analysis', category: 'Revenue Analysis', description: 'Change in User ARPU' },
      { id: 'telecom-traffic-usage', name: 'Traffic Usage Analysis', category: 'Traffic Analysis', description: 'Average Traffic per Household and Growth' },
      { id: 'telecom-package-pie', name: 'Package Distribution Analysis', category: 'Package Analysis', description: 'User Share by Plan' },
      { id: 'telecom-network-quality', name: 'Network Quality Analysis', category: 'Network Analysis', description: 'Coverage and Speed Distribution' },
      { id: 'telecom-complaint-categories', name: 'Complaint Category Analysis', category: 'Service Analysis', description: 'Complaint Type and Share' },
      { id: 'telecom-channel-bar', name: 'Channel Capacity Analysis', category: 'Channel Analysis', description: 'User Acquisition Volume by Channel' },
      { id: 'telecom-device-share', name: 'Terminal Market Share Analysis', category: 'Terminal Analysis', description: 'Terminal Share by Brand' },
      { id: 'Roaming Service Analysis', name: 'Roaming Service Analysis', category: 'Business Analysis', description: 'International/Domestic Roaming Volume' },
      { id: 'telecom-vas-revenue', name: 'Value-added Service Revenue', category: 'Revenue Analysis', description: 'Revenue by Value-Added Service' },
      { id: 'telecom-broadband-speed', name: 'Broadband Speed Analysis', category: 'Broadband Analysis', description: 'Share of Speed Tiers by Plan' },
      { id: 'telecom-4g5g-transition', name: '4G-5G Migration Analysis', category: 'Network Evolution', description: '4G to 5G Upgrade Conversion Rate' },
    ],
  },
  // ===== Energy and Power =====
  {
    id: 'energy',
    name: 'Energy and Power',
    icon: '⚡',
    description: 'Power Generation Enterprises, Grid Operation, Gas & Water Utilities',
    keywords: ['energy, power, electricity, energy, Energy', 'Electric Power', 'Power Generation', 'Power Consumption', 'Power Grid', 'Gas'],
    templates: [
      { id: 'energy-power-trend', name: 'Power Generation Trend Analysis', category: 'Power Generation Analysis', description: 'Daily/Weekly/Monthly Generation Output Change' },
      { id: 'Load Curve Analysis', name: 'Load Curve Analysis', category: 'Power Grid Analysis', description: 'Peak-Valley Load Distribution' },
      { id: 'energy-cost-breakdown', name: 'Cost per kWh Analysis', category: 'Cost Analysis', description: 'Proportion of Each Cost Item' },
      { id: 'energy-efficiency-radar', name: 'Energy Efficiency Indicator Analysis', category: 'Efficiency Analysis', description: 'Plant Power Consumption Rate and Line Loss Rate' },
      { id: 'energy-emission-bar', name: 'Emission Indicator Analysis', category: 'Environmental Protection Analysis', description: 'Emission Volume and Compliance Rate' },
      { id: 'energy-reserve-level', name: 'Inventory Level Analysis', category: 'Inventory Analysis', description: 'Coal/Gas Inventory Tracking' },
      { id: 'energy-price-trend', name: 'Electricity Price Trend Analysis', category: 'Price Analysis', description: 'Peak-Valley Electricity Price Distribution' },
      { id: 'energy-renewable-share', name: 'Clean Energy Share', category: 'Structural Analysis', description: 'Share Change of Wind, Solar, Hydro and Nuclear Power' },
      { id: 'energy-usage-sector', name: 'Sector Power Consumption Analysis', category: 'Power Consumption Analysis', description: 'Power Consumption Share by Industry' },
      { id: 'energy-equipment-status', name: 'Equipment Status Analysis', category: 'Equipment Analysis', description: 'Equipment Operation and Fault Statistics' },
      { id: 'Water Consumption Analysis', name: 'Water Consumption Analysis', category: 'Resource Analysis', description: 'Production Water Consumption and Efficiency' },
      { id: 'energy-maintenance-schedule', name: 'Maintenance Schedule Analysis', category: 'Operation and Maintenance Analysis', description: 'Maintenance Completion Rate Tracking' },
    ],
  },
  // ===== Automotive Industry =====
  {
    id: 'automotive',
    name: 'Automotive Industry',
    icon: '🚗',
    description: 'Complete Vehicle Manufacturing, Automobile Sales, After-sales Service',
    keywords: ['automotive, car, vehicle, auto, Automotive', 'Vehicle', 'Complete Vehicle', '4S Store', 'After-sales', 'Maintenance'],
    templates: [
      { id: 'Sales Volume Trend Analysis', name: 'Sales Volume Trend Analysis', category: 'Sales Analysis', description: 'Monthly/Quarterly/Annual Sales Volume Change' },
      { id: 'auto-model-ranking', name: 'Model Sales Ranking', category: 'Product Analysis', description: 'Vehicle Sales Ranking by Model' },
      { id: 'auto-dealer-performance', name: 'Dealer Performance Analysis', category: 'Channel Analysis', description: 'Target Completion Rate by Dealer' },
      { id: 'auto-inventory-level', name: 'Inventory Depth Analysis', category: 'Inventory Analysis', description: 'Inventory Turnover and Alert' },
      { id: 'Market Share Analysis', name: 'Market Share Analysis', category: 'Market Analysis', description: 'Brand/Model Market Share' },
      { id: 'Price Trend Analysis', name: 'Price Trend Analysis', category: 'Pricing Analysis', description: 'Terminal Preference Trend' },
      { id: 'auto-service-revenue', name: 'After-sales Output Revenue Analysis', category: 'After-sales Analysis', description: 'Maintenance/Service/Parts Output Value' },
      { id: 'auto-customer-waiting', name: 'Waiting Time Analysis', category: 'Service Analysis', description: 'Distribution of Customer Waiting Time' },
      { id: 'auto-parts-inventory', name: 'Parts Inventory Analysis', category: 'Parts Analysis', description: 'Parts Turnover and Alert' },
      { id: 'Return Visit Rate Analysis', name: 'Return Visit Rate Analysis', category: 'Customer Analysis', description: 'Customer Return Frequency' },
      { id: 'auto-channel-online', name: 'Online Channel Analysis', category: 'Channel Analysis', description: 'Official Website/E-commerce Lead Volume' },
      { id: 'Test Drive Conversion Analysis', name: 'Test Drive Conversion Analysis', category: 'Conversion Analysis', description: 'Test Drive-to-Transaction Conversion' },
    ],
  },
  // ===== Agriculture and Animal Husbandry =====
  {
    id: 'agriculture',
    name: 'Agriculture and Animal Husbandry',
    icon: '🌾',
    description: 'Crop & Livestock Farming, Agricultural Product Processing, Agricultural Material Circulation',
    keywords: ['agriculture, farm, crop, livestock, Agriculture', 'Crop Cultivation', 'Aquaculture/Livestock Farming', 'Agricultural Products', 'Animal Husbandry', 'Agricultural Materials'],
    templates: [
      { id: 'Output Trend Analysis', name: 'Output Trend Analysis', category: 'Production Analysis', description: 'Output Change by Category' },
      { id: 'Price Trend Analysis', name: 'Price Trend Analysis', category: 'Price Analysis', description: 'Change in Purchase Price and Market Price' },
      { id: 'agri-quality-grade', name: 'Quality Grade Analysis', category: 'Quality Analysis', description: 'Share Distribution by Grade' },
      { id: 'Yield Per Mu Efficiency Analysis', name: 'Yield Per Mu Efficiency Analysis', category: 'Efficiency Analysis', description: 'Yield per Mu Comparison by Base' },
      { id: 'agri-feed-conversion', name: 'Feed Conversion Analysis', category: 'Farming Analysis', description: 'Feed Conversion Ratio (FCR) for Meat/Eggs' },
      { id: 'agri-disease-outbreak', name: 'Disease Early Warning Analysis', category: 'Risk Analysis', description: 'Disease Outbreak and Loss' },
      { id: 'agri-weather-impact', name: 'Climate Impact Analysis', category: 'External Analysis', description: 'Impact of Weather on Output' },
      { id: 'Supply Chain Analysis', name: 'Supply Chain Analysis', category: 'Distribution Analysis', description: 'Distribution Links and Loss' },
      { id: 'Import and Export Analysis', name: 'Import and Export Analysis', category: 'Trade Analysis', description: 'Import/Export Volume and Trend' },
      { id: 'agri-inventory-storage', name: 'Inventory Storage Analysis', category: 'Warehouse Analysis', description: 'Inventory Capacity and Turnover' },
      { id: 'Certification Analysis', name: 'Certification Analysis', category: 'Quality Analysis', description: 'Organic/Green Certification Proportion' },
      { id: 'agri-subsidy-distribution', name: 'Subsidy Distribution Analysis', category: 'Policy Analysis', description: 'Subsidy Coverage and Distribution' },
    ],
  },
  // ===== Legal Services =====
  {
    id: 'legal',
    name: 'Legal Services',
    icon: '⚖️',
    description: 'Law Firms, Legal Consultation, Notarization and Arbitration',
    keywords: ['legal, law, lawyer, attorney, Legal', 'Lawyer', 'Case', 'Litigation', 'Consulting', 'Notarization'],
    templates: [
      { id: 'Case Trend Analysis', name: 'Case Trend Analysis', category: 'Business Analysis', description: 'Change in New Case Intake/Closed Case Volume' },
      { id: 'Case Type Analysis', name: 'Case Type Analysis', category: 'Business Analysis', description: 'Case Share by Type' },
      { id: 'legal-attorney-workload', name: 'Attorney Workload Analysis', category: 'Performance Analysis', description: 'Case Volume by Lawyer' },
      { id: 'legal-case-duration', name: 'Case Cycle Analysis', category: 'Efficiency Analysis', description: 'Average Case Processing Cycle' },
      { id: 'legal-win-rate', name: 'Win Rate Analysis', category: 'Quality Analysis', description: 'Win Rate by Case Type' },
      { id: 'legal-revenue-client', name: 'Customer Revenue Generation Analysis', category: 'Revenue Analysis', description: 'Customer Revenue Contribution Ranking' },
      { id: 'Rate Analysis', name: 'Rate Analysis', category: 'Pricing Analysis', description: 'Hourly Rate and Billing Model' },
      { id: 'legal-payment-collection', name: 'Payment Collection Analysis', category: 'Financial Analysis', description: 'Accounts Receivable and Collection Rate' },
      { id: 'New Client Analysis', name: 'New Client Analysis', category: 'Customer Analysis', description: 'New Customer Acquisition Volume' },
      { id: 'legal-referral-source', name: 'Channel Source Analysis', category: 'Channel Analysis', description: 'Customer Source Distribution' },
      { id: 'Consultation Conversion Analysis', name: 'Consultation Conversion Analysis', category: 'Conversion Analysis', description: 'Inquiry-to-Retainer Conversion Rate' },
      { id: 'legal-ethics-compliance', name: 'Compliance Audit Analysis', category: 'Compliance Analysis', description: 'Compliance Check Issue Statistics' },
    ],
  },
  // ===== Human Resources =====
  {
    id: 'hr',
    name: 'Human Resources',
    icon: '👥',
    description: 'Corporate HR, Headhunting Recruitment, Labor Outsourcing',
    keywords: ['hr, human, recruit, employee, Human Resources', 'HR Employee', 'Recruitment', 'Compensation', 'Performance'],
    templates: [
      { id: 'Headcount Trend', name: 'Headcount Trend', category: 'Headcount Analysis', description: 'Change in Number of Staffed Employees' },
      { id: 'Turnover Rate Analysis', name: 'Turnover Rate Analysis', category: 'Turnover Analysis', description: 'Voluntary/Involuntary Turnover Proportion' },
      { id: 'hr-recruitment-funnel', name: 'Recruitment Funnel Analysis', category: 'Recruitment Analysis', description: 'Application Submission - Interview - Offer Conversion' },
      { id: 'Time-to-Hire Analysis', name: 'Time-to-Hire Analysis', category: 'Recruitment Analysis', description: 'Average Time to Hire per Position' },
      { id: 'hr-salary-breakdown', name: 'Compensation Structure Analysis', category: 'Compensation Analysis', description: 'Fixed Salary/Performance Pay/Bonus Proportion' },
      { id: 'hr-performance-distribution', name: 'Performance Distribution Analysis', category: 'Performance Analysis', description: 'ABC Classification Share' },
      { id: 'hr-department-headcount', name: 'Department Headcount Analysis', category: 'Structural Analysis', description: 'Headcount Share by Department' },
      { id: 'Age Structure Analysis', name: 'Age Structure Analysis', category: 'Structural Analysis', description: 'Proportion by Age Group' },
      { id: 'Educational Structure Analysis', name: 'Educational Structure Analysis', category: 'Structural Analysis', description: 'Proportion by Education Level' },
      { id: 'Training Duration Analysis', name: 'Training Duration Analysis', category: 'Training Analysis', description: 'Average Training Hours per Capita' },
      { id: 'hr-bonus-cost', name: 'Bonus Cost Analysis', category: 'Cost Analysis', description: 'Total Bonus Amount and Proportion' },
      { id: 'hr-absenteeism', name: 'Absenteeism Rate Analysis', category: 'Attendance Analysis', description: 'Various Absence Statistics' },
    ],
  },
  // ===== Government Public Affairs =====
  {
    id: 'government',
    name: 'Government Public Affairs',
    icon: '🏛️',
    description: 'Government Services, Grassroots Governance, Public Facilities',
    keywords: ['government', 'public', 'service', 'Government Affairs', 'Government', 'Public Services', 'Community', 'Sub-district', 'Approval'],
    templates: [
      { id: 'Service Volume Trend Analysis', name: 'Service Volume Trend Analysis', category: 'Service Analysis', description: 'Change in Document Processing Volume' },
      { id: 'Service Type Analysis', name: 'Service Type Analysis', category: 'Service Analysis', description: 'Proportion of Each Work Item' },
      { id: 'gov-processing-time', name: 'Processing Lead Time Analysis', category: 'Efficiency Analysis', description: 'Average Processing Duration' },
      { id: 'Satisfaction Analysis', name: 'Satisfaction Analysis', category: 'Evaluation Analysis', description: 'Positive Review Rate and Review Distribution' },
      { id: 'gov-online-ratio', name: 'Online Processing Rate', category: 'Digital Analysis', description: 'Online Processing Rate and Trend' },
      { id: 'gov-age-group', name: 'Service User Demographic Analysis', category: 'User Analysis', description: 'Proportion by Age Group' },
      { id: 'gov-license-approval', name: 'License Approval Analysis', category: 'Approval Analysis', description: 'License and Certificate Processing Statistics' },
      { id: 'gov-complaint-categories', name: 'Complaint Category Analysis', category: 'Complaint Analysis', description: 'Proportion of Complaint Types' },
      { id: 'gov-community-event', name: 'Community Event Analysis', category: 'Activity Analysis', description: 'Event Sessions and Participation' },
      { id: 'gov-emergency-incident', name: 'Emergency Incident Analysis', category: 'Emergency Analysis', description: 'Incident Type and Disposition' },
      { id: 'gov-facility-utilization', name: 'Facility Utilization Rate', category: 'Resource Analysis', description: 'Venue Utilization Rate' },
      { id: 'Staff Workload', name: 'Staff Workload', category: 'Performance Analysis', description: 'Average Processing Volume per Capita' },
    ],
  },
  // ===== Sports and Fitness =====
  {
    id: 'sports',
    name: 'Sports and Fitness',
    icon: '🏃',
    description: 'Fitness Clubs, Sports Training, Event Operation',
    keywords: ['sports', 'fitness', 'gym', 'Sports', 'Fitness', 'Member', 'Venue', 'Training', 'Event'],
    templates: [
      { id: 'sports-member-trend', name: 'Membership Trend Analysis', category: 'Member Analysis', description: 'New/Churned/Net New Members' },
      { id: 'sports-checkin-heatmap', name: 'Check-In Time Heatmap', category: 'Traffic Analysis', description: 'Venue Headcount by Time Period' },
      { id: 'sports-class-popularity', name: 'Class Popularity Analysis', category: 'Course Analysis', description: 'Booking Volume by Course' },
      { id: 'sports-revenue-breakdown', name: 'Revenue Structure Analysis', category: 'Revenue Analysis', description: 'Membership/Course/Retail Proportion' },
      { id: 'sports-churn-risk', name: 'Churn Risk Analysis', category: 'Member Analysis', description: 'Churn Warning List' },
      { id: 'sports-coach-performance', name: 'Coach Performance Analysis', category: 'Performance Analysis', description: 'Coach Teaching Hours and Evaluations' },
      { id: 'sports-class-utilization', name: 'Group Class Utilization Rate', category: 'Operational Analysis', description: 'Group Class Full Occupancy Rate' },
      { id: 'sports-retail-merch', name: 'Retail Merchandise Analysis', category: 'Retail Analytics', description: 'Product Sales and Inventory' },
      { id: 'sports-event-attendance', name: 'Event Attendance Rate', category: 'Event Analysis', description: 'Event Participation Headcount' },
      { id: 'sports-member-age', name: 'Member Age Analysis', category: 'User Analysis', description: 'Member Age Distribution' },
      { id: 'sports-private-vs-group', name: 'Personal Training vs. Group Class Comparison', category: 'Product Analysis', description: 'Proportion of Personal Training and Group Classes' },
      { id: 'sports-visits-per-week', name: 'Visit Frequency Analysis', category: 'Behavioral Analysis', description: 'Distribution of Average Weekly Store Visits' },
    ],
  },
  // ===== Environmental Sanitation =====
  {
    id: 'environmental',
    name: 'Environmental Sanitation',
    icon: '🌿',
    description: 'Environmental Sanitation, Waste Treatment, Environmental Monitoring',
    keywords: ['environmental, waste, cleaning, Environmental Protection', 'Environmental Sanitation', 'Waste', 'Cleaning', 'Environment', 'Monitoring', 'Greening'],
    templates: [
      { id: 'env-waste-trend', name: 'Waste Volume Trend Analysis', category: 'Sanitation Analysis', description: 'Daily Waste Volume Change' },
      { id: 'env-classification-rate', name: 'Sorting Rate Analysis', category: 'Classification Analysis', description: 'Proportion of Wet and Dry Waste Classification' },
      { id: 'env-cleaning-coverage', name: 'Cleaning Coverage Rate', category: 'Cleaning Analysis', description: 'Operating Area and Frequency' },
      { id: 'env-vehicle-utilization', name: 'Work Vehicle Analysis', category: 'Equipment Analysis', description: 'Vehicle Utilization and Mileage' },
      { id: 'env-air-quality', name: 'Air Quality Analysis', category: 'Monitoring and Analysis', description: 'AQI and Distribution of Individual Indicators' },
      { id: 'env-water-quality', name: 'Water Quality Monitoring Analysis', category: 'Monitoring and Analysis', description: 'Data by Monitoring Point' },
      { id: 'env-complaint-handling', name: 'Complaint Handling Analysis', category: 'Service Analysis', description: 'Complaint Response and Resolution Rate' },
      { id: 'env-green-coverage', name: 'Green Coverage Rate', category: 'Greening Analysis', description: 'Greening Proportion by Region' },
      { id: 'env-incident-response', name: 'Emergency Response', category: 'Emergency Analysis', description: 'Response Time and Disposition' },
      { id: 'env-cost-per-ton', name: 'Cost per Ton of Waste', category: 'Cost Analysis', description: 'Unit Processing Cost' },
      { id: 'env-recyclable-rate', name: 'Recyclable Rate Analysis', category: 'Resource Analysis', description: 'Proportion of Recyclable Waste' },
      { id: 'env-landfill-usage', name: 'Landfill Usage Analysis', category: 'Facility Analysis', description: 'Remaining Storage Capacity and Utilization' },
    ],
  },
  // ===== Culture and Publishing =====
  {
    id: 'publishing',
    name: 'Culture and Publishing',
    icon: '📖',
    description: 'Book Publishing, Newspapers & Periodicals, Copyright Operation',
    keywords: ['publishing', 'book', 'magazine', 'Copyright', 'Publishing', 'Book', 'Newspapers and Periodicals', 'Copyright', 'Distribution'],
    templates: [
      { id: 'pub-sales-trend', name: 'Distribution Trend Analysis', category: 'Distribution Analysis', description: 'Change in Circulation Volume' },
      { id: 'pub-category-structure', name: 'Category Structure Analysis', category: 'Product Analysis', description: 'Proportion by Category' },
      { id: 'pub-bestseller', name: 'Bestseller Ranking', category: 'Product Analysis', description: 'Top Book Sales' },
      { id: 'pub-inventory-age', name: 'Inventory Age Analysis', category: 'Inventory Analysis', description: 'Slow-Moving Books and Inventory Age Distribution' },
      { id: 'pub-return-rate', name: 'Return Rate Analysis', category: 'Channel Analysis', description: 'Channel Return Rate Tracking' },
      { id: 'pub-channel-sales', name: 'Channel Sales Analysis', category: 'Channel Analysis', description: 'Online/Offline/In-Gym Proportion' },
      { id: 'pub-author-performance', name: 'Author Royalty Analysis', category: 'Copyright Analysis', description: 'Author Royalty Expenditure' },
      { id: 'pub-copyright-license', name: 'Copyright Licensing Analysis', category: 'Copyright Analysis', description: 'Copyright Export/Import Statistics' },
      { id: 'pub-print-run', name: 'Print Run Analysis', category: 'Production Analysis', description: 'First Printing and Reprint Statistics' },
      { id: 'pub-reader-demographic', name: 'Reader Profiling Analysis', category: 'User Analysis', description: 'Reader Age/Gender Distribution' },
      { id: 'pub-award-impact', name: 'Award-Winning Work Analysis', category: 'Quality Analysis', description: 'Impact of Awards on Work Sales' },
      { id: 'pub-digital-revenue', name: 'Digital Revenue Analysis', category: 'Revenue Analysis', description: 'E-book/Audiobook Revenue' },
    ],
  },
  // ===== More industries... =====
  // Add more industries as needed
];

// Get industry config
export function getIndustryConfig(industryId: string): IndustryConfig | undefined {
  return INDUSTRY_CONFIGS.find(i => i.id === industryId);
}

// Search industry
export function searchIndustries(keyword: string): IndustryConfig[] {
  const kw = keyword.toLowerCase();
  return INDUSTRY_CONFIGS.filter(i =>
    i.name.includes(keyword) ||
    i.description.includes(keyword) ||
    i.keywords.some(k => k.toLowerCase().includes(kw))
  );
}

// Smart industry detection
export function detectIndustry(headers: string[], sampleRows: Record<string, CellValue>[]): string | null {
  const text = [...headers, ...sampleRows.slice(0, 5).map(r => Object.values(r).join(' '))].join(' ').toLowerCase();
  
  for (const industry of INDUSTRY_CONFIGS) {
    const matchCount = industry.keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (matchCount >= 2) {
      return industry.id;
    }
  }
  
  return null;
}

export default function IndustryDashboardTemplate({
  data,
  industryId,
  height = 600
}: {
  data: { headers: string[]; rows: Record<string, CellValue>[] };
  industryId: string;
  height?: number;
}) {
  const config = getIndustryConfig(industryId);
  const industry = config || INDUSTRY_CONFIGS[0];

  // Smart field mapping
  const fieldMap = (() => {
    const headers = data.headers.map(h => h.toLowerCase());
    const find = (kws: string[]) => data.headers.find(h => kws.some(k => h.toLowerCase().includes(k)));
    return {
      date: find(['Date', 'Date, Time', 'Time, Month', 'Month, Week', 'Week, Year', 'year']) || data.headers[0],
      value: find(['Amount', 'amount', 'Sales Volume', 'sales', 'Quantity', 'count', 'Revenue', 'revenue', 'Revenue', 'total']) || 
             data.headers.find(h => typeof data.rows[0]?.[h] === 'number') || data.headers[1],
      category: find(['Category', 'category', 'Category', 'Type, Name', 'Name, Product', 'product']),
    };
  })();

  // Common themes
  const theme = {
    color: THEME_COLORS,
    backgroundColor: 'transparent',
    title: { textStyle: { color: DARK_TEXT }, subtextStyle: { color: DARK_SUBTEXT } },
    legend: { textStyle: { color: DARK_SUBTEXT } },
    tooltip: { backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: DARK_TEXT } },
    xAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
    yAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
  };

  // Default chart
  const defaultOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: `${industry.name} Overview`, left: 'center', textStyle: { color: DARK_TEXT, fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: [fieldMap.value], textStyle: { color: DARK_SUBTEXT }, top: 30 },
    xAxis: { type: 'category', data: data.rows.slice(0, 12).map(r => String(r[fieldMap.date] || '')) },
    yAxis: { type: 'value' },
    series: [{
      name: fieldMap.value,
      type: 'bar',
      data: data.rows.slice(0, 12).map(r => Number(r[fieldMap.value]) || 0),
      itemStyle: { color: new Date().getDay() % 2 === 0 ? '#5470c6' : '#91cc75', borderRadius: [3, 3, 0, 0] },
    }],
    grid: { left: 50, right: 20, top: 60, bottom: 30 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: DARK_TEXT, margin: 0 }}>{industry.icon} {industry.name} - Dashboard Templates</h3>
        <span style={{ color: DARK_SUBTEXT, fontSize: 12 }}>{industry.description}</span>
      </div>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={defaultOption} theme={theme as never} style={{ height: height - 60 }} />
      </div>
      <div style={{ marginTop: 12, color: DARK_SUBTEXT, fontSize: 11 }}>
        {industry.templates.length} templates available | Industry: {industry.name}
      </div>
    </div>
  );
}
