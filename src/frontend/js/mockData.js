// Mock data for SWPM Demo
const MOCK = {
  baselines: [
    { project: 'ESP10', baseline: 'BL3.1', category: 'Core', features: 'ABS/TCS Enhancement', sprint: 'S6/12', codeFreeze: '2026-09-15', paramFreeze: '2026-09-22', releaseCat: 'B-Sample', status: 'Ongoing' },
    { project: 'ESP10', baseline: 'BL3.2', category: 'Advanced', features: 'ESC Sport Mode', sprint: 'S3/8', codeFreeze: '2026-10-20', paramFreeze: '2026-10-28', releaseCat: 'A-Sample', status: 'Ongoing' },
    { project: 'IPB2.0', baseline: 'BL2.0', category: 'New', features: 'Brake-by-Wire Init', sprint: 'S8/10', codeFreeze: '2026-09-05', paramFreeze: '2026-09-10', releaseCat: 'C-Sample', status: 'Ongoing' },
    { project: 'ROPP41', baseline: 'BL1.0', category: 'Core', features: 'Pedal Map Rework', sprint: 'S4/6', codeFreeze: '2026-09-30', paramFreeze: '2026-10-05', releaseCat: 'B-Sample', status: 'Pending' },
    { project: 'RBU', baseline: 'BL2.1', category: 'Advanced', features: 'Regen Braking Opt', sprint: 'S5/8', codeFreeze: '2026-11-01', paramFreeze: '2026-11-08', releaseCat: 'A-Sample', status: 'Pending' },
    { project: 'BWA', baseline: 'BL1.2', category: 'Core', features: 'Wheel Angle Sensor', sprint: 'S7/7', codeFreeze: '2026-08-25', paramFreeze: '2026-08-28', releaseCat: 'C-Sample', status: 'Closed' },
  ],

  tasks: [
    { id: 'ALM-4521', type: 'EPIC', title: 'ABS/TCS Enhancement — BL3.1', source: 'ALM', assignee: 'M. Chen', priority: 'High', due: '2026-09-15', status: 'In Progress', maturity: 72 },
    { id: 'ALM-4522', type: 'Story', title: 'Implement ABS slip threshold calibration', source: 'ALM', assignee: 'L. Wang', priority: 'High', due: '2026-09-08', status: 'In Progress', maturity: 65 },
    { id: 'ALM-4530', type: 'Task', title: 'Unit test for TCS torque limiter', source: 'ALM', assignee: 'K. Zhang', priority: 'Medium', due: '2026-09-10', status: 'To Do', maturity: 0 },
    { id: 'QC-1287', type: 'Task', title: 'Integration test — ABS HiL scenario', source: 'QC', assignee: 'J. Li', priority: 'High', due: '2026-09-12', status: 'To Do', maturity: 0 },
    { id: 'DOORS-892', type: 'Task', title: 'Review SWXS-2134 traceability', source: 'DOORS', assignee: 'S. Müller', priority: 'Medium', due: '2026-09-06', status: 'In Review', maturity: 85 },
    { id: 'ALM-4535', type: 'Story', title: 'ESC Sport Mode parameter set', source: 'ALM', assignee: 'P. Schmidt', priority: 'Low', due: '2026-10-15', status: 'To Do', maturity: 10 },
    { id: 'ALM-4540', type: 'Task', title: 'Brake-by-Wire CAN signal mapping', source: 'ALM', assignee: 'M. Chen', priority: 'High', due: '2026-09-03', status: 'In Progress', maturity: 88 },
    { id: 'QC-1290', type: 'Task', title: 'QG Maturity Check — IPB2.0 BL2.0', source: 'QC', assignee: 'J. Li', priority: 'High', due: '2026-09-04', status: 'In Progress', maturity: 55 },
    { id: 'DOORS-900', type: 'Task', title: 'Update AS requirements for pedal map', source: 'DOORS', assignee: 'A. Kumar', priority: 'Medium', due: '2026-09-25', status: 'To Do', maturity: 0 },
    { id: 'ALM-4550', type: 'Task', title: 'Code review — Regen braking controller', source: 'ALM', assignee: 'L. Wang', priority: 'Low', due: '2026-10-28', status: 'To Do', maturity: 0 },
    { id: 'QC-1295', type: 'Task', title: 'Test execution — wheel angle sensor', source: 'QC', assignee: 'K. Zhang', priority: 'Medium', due: '2026-08-30', status: 'Done', maturity: 100 },
    { id: 'ALM-4555', type: 'Story', title: 'FO Task: Sprint S7 feature integration', source: 'ALM', assignee: 'P. Schmidt', priority: 'High', due: '2026-09-01', status: 'Done', maturity: 100 },
  ],

  // DOORS (Requirement -> Spec[]) -> ALM (Epic -> per-Spec Story/Task/Review) -> QC (Component Test) traceability
  traceability: [
    {
      reqId: 'DOORS-REQ-100', reqName: 'ABS Slip Control Enhancement',
      health: { level: 'ok', label: 'Healthy', reason: 'On track' },
      epic: { id: 'ALM-4521', title: 'ABS/TCS Enhancement — BL3.1', progress: 72 },
      // One requirement can decompose into multiple Specs; each Spec drives its own Story chain
      specs: [
        {
          id: 'DOORS-SPEC-2201', name: 'ABS Slip Threshold Calibration Spec', status: 'Approved',
          stories: [
            {
              id: 'ALM-4522', title: 'Implement ABS slip threshold calibration', progress: 65,
              qc: { componentTest: 'QC-CT-3305', testStatus: 'Passed' },
              tasks: [
                { id: 'ALM-4530', title: 'Unit test for TCS torque limiter', status: 'To Do',
                  review: { reviewer: 'K. Zhang', status: 'Pending' } },
                { id: 'ALM-4531', title: 'Calibrate slip threshold parameters', status: 'In Progress',
                  review: { reviewer: 'L. Wang', status: 'Pending' } },
              ],
            },
          ],
        },
        {
          id: 'DOORS-SPEC-2202', name: 'ABS Warning Indicator Spec', status: 'Approved',
          stories: [
            {
              id: 'ALM-4523', title: 'Implement ABS warning indicator logic', progress: 80,
              qc: { componentTest: 'QC-CT-3306', testStatus: 'Passed' },
              tasks: [
                { id: 'ALM-4532', title: 'Implement indicator driver', status: 'Done',
                  review: { reviewer: 'K. Zhang', status: 'Approved' } },
              ],
            },
          ],
        },
      ],
    },
    {
      reqId: 'DOORS-REQ-103', reqName: 'Brake Pressure Modulation',
      health: { level: 'warn', label: 'At Risk', reason: 'Component Test lagging behind Story progress' },
      epic: { id: 'ALM-4560', title: 'Brake-by-Wire Init — BL2.0', progress: 40 },
      specs: [
        {
          id: 'DOORS-SPEC-2210', name: 'Brake-by-Wire CAN Signal Spec', status: 'Approved',
          stories: [
            {
              id: 'ALM-4540', title: 'Brake-by-Wire CAN signal mapping', progress: 55,
              qc: { componentTest: 'QC-CT-3312', testStatus: 'In Progress' },
              tasks: [
                { id: 'ALM-4541', title: 'Define CAN frame layout', status: 'Done',
                  review: { reviewer: 'M. Chen', status: 'Approved' } },
                { id: 'ALM-4542', title: 'Implement signal scaling logic', status: 'In Progress',
                  review: { reviewer: 'S. Müller', status: 'In Review' } },
              ],
            },
          ],
        },
      ],
    },
    {
      reqId: 'DOORS-REQ-106', reqName: 'Hill Hold Assist Logic',
      health: { level: 'bad', label: 'Blocked', reason: 'Spec not approved — downstream Epic/Story/Test all delayed' },
      epic: { id: 'ALM-4535', title: 'ESC Sport Mode — BL3.2', progress: 15 },
      specs: [
        {
          id: 'DOORS-SPEC-2218', name: 'ESC Sport Mode Parameter Spec', status: 'Draft',
          stories: [
            {
              id: 'ALM-4536', title: 'ESC Sport Mode parameter set', progress: 10,
              qc: { componentTest: 'QC-CT-3320', testStatus: 'Not Run' },
              tasks: [
                { id: 'ALM-4550', title: 'Code review — Regen braking controller', status: 'To Do',
                  review: { reviewer: 'L. Wang', status: 'Pending' } },
              ],
            },
          ],
        },
      ],
    },
  ],

  milestones: [
    { date: '2026-09-01', title: 'Sprint S7 Delivery', desc: 'ESP10 BL3.1', urgency: '' },
    { date: '2026-09-03', title: 'CAN Signal Review', desc: 'IPB2.0 BL2.0', urgency: 'urgent' },
    { date: '2026-09-05', title: 'Code Freeze', desc: 'IPB2.0 BL2.0', urgency: 'urgent' },
    { date: '2026-09-10', title: 'Parameter Freeze', desc: 'IPB2.0 BL2.0', urgency: 'warning' },
    { date: '2026-09-15', title: 'Code Freeze', desc: 'ESP10 BL3.1', urgency: 'warning' },
    { date: '2026-09-22', title: 'ASW Integration', desc: 'ESP10 BL3.1', urgency: '' },
    { date: '2026-09-30', title: 'Code Freeze', desc: 'ROPP41 BL1.0', urgency: '' },
  ],

  features: [
    { id: 'DOORS-REQ-100', name: 'ABS Slip Control Enhancement', checked: true },
    { id: 'DOORS-REQ-101', name: 'TCS Torque Limiter V2', checked: true },
    { id: 'DOORS-REQ-102', name: 'ESC Yaw Rate Optimization', checked: false },
    { id: 'DOORS-REQ-103', name: 'Brake Pressure Modulation', checked: true },
    { id: 'DOORS-REQ-104', name: 'CAN Signal Mapping Update', checked: false },
    { id: 'DOORS-REQ-105', name: 'Wheel Speed Sensor Diagnostics', checked: false },
    { id: 'DOORS-REQ-106', name: 'Hill Hold Assist Logic', checked: true },
    { id: 'DOORS-REQ-107', name: 'Brake Blending Strategy', checked: false },
  ],

  risks: [
    { level: 'high', title: 'IPB2.0 BL2.0 — Code Freeze at risk', desc: 'Burndown shows 15% remaining tasks unlikely to complete by Sep 5. CAN signal mapping still in progress.', project: 'IPB2.0' },
    { level: 'high', title: 'QG Maturity gap — IPB2.0', desc: 'QC test coverage at 78%, target 95%. 34 test cases pending execution before QG date.', project: 'IPB2.0' },
    { level: 'medium', title: 'Effort deviation — ESP10 BL3.1', desc: 'Actual effort +8.5% above planned for August. Sprint S6 velocity lower than forecast.', project: 'ESP10' },
    { level: 'low', title: 'DOORS traceability gap — ROPP41', desc: '3 SWXS requirements not yet linked to QC test cases. Due for resolution by Sep 20.', project: 'ROPP41' },
  ],

  notifications: [
    { type: 'due', title: 'Code Freeze in 5 days — IPB2.0 BL2.0', desc: 'Scheduled for Sep 5. 4 tasks still in progress, 2 blocked. Immediate attention required.', time: '2 hours ago', unread: true },
    { type: 'risk', title: 'Burndown Risk Alert — IPB2.0', desc: 'Based on current velocity, estimated 3-day delay for BL2.0 delivery. Recommend resource reallocation.', time: '4 hours ago', unread: true },
    { type: 'due', title: 'Parameter Freeze in 10 days — IPB2.0 BL2.0', desc: 'Scheduled for Sep 10. Calibration data review pending from 2 team members.', time: '6 hours ago', unread: true },
    { type: 'update', title: 'Weekly Report Generated — Week 35', desc: 'ALM-QC-DOORS consolidated report for ESP10, IPB2.0 is ready. Sent to SWPCM and CC developers.', time: '1 day ago', unread: false },
    { type: 'update', title: 'Task Auto-Generated — ESP10 BL3.2', desc: 'BEG Wizard created 2 EPICs, 8 Stories, 31 Tasks from baseline information. Review in ALM.', time: '2 days ago', unread: false },
    { type: 'risk', title: 'Effort Control Warning — ESP10', desc: 'Monthly effort deviation reached +8.5% (threshold: ±5%). Review resource allocation.', time: '3 days ago', unread: false },
    { type: 'due', title: 'QG Review Due — BWA BL1.2', desc: 'Quality Gate review completed. All criteria met. Baseline closed successfully.', time: '5 days ago', unread: false },
  ],

  burndown: {
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    ideal: [120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 0],
    actual: [120, 115, 108, 95, 88, 78, 70, null, null, null, null, null],
    predicted: [null, null, null, null, null, null, 70, 62, 50, 38, 22, 8],
  },

  kpiTrend: {
    labels: ['BL1.0', 'BL1.1', 'BL2.0', 'BL2.1', 'BL3.0', 'BL3.1'],
    reqMgmt: [25, 22, 18, 15, 14, 12],
    effortCtrl: [8, 6, 4.5, 5.2, 3.8, 3.2],
    testCoverage: [85, 88, 90, 91, 93, 94],
  },
};
