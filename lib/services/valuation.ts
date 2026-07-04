import mockTransactions from '../mock-data/transactions';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ValuationRequest {
  projectName: string;
  district: number;
  sizeSqft: number;
  floor: 'Low' | 'Mid' | 'High';
  propertyType: 'Condo' | 'HDB' | 'Landed' | 'Commercial' | 'EC';
}

export interface ValuationResult {
  estimatedValue: number;
  estimatedPsf: number;
  confidenceScore: number; // 0 - 100
  confidenceLabel: 'High' | 'Medium' | 'Low';
  comparableTransactionsCount: number;
  lowEstimateRange: number;
  highEstimateRange: number;
  districtAveragePsf: number;
}

export const getInstantValuation = async (req: ValuationRequest): Promise<ValuationResult> => {
  await delay(500);

  // Look up transactions in the same project or district
  const projectTx = mockTransactions.filter(tx => 
    tx.projectName.toLowerCase() === req.projectName.toLowerCase()
  );

  const districtTx = mockTransactions.filter(tx => tx.district === req.district);

  let basePsf = 0;
  let comparableTransactionsCount = 0;
  let confidenceScore = 80;

  if (projectTx.length > 0) {
    // Average project PSF
    const totalPsf = projectTx.reduce((sum, tx) => sum + tx.psf, 0);
    basePsf = totalPsf / projectTx.length;
    comparableTransactionsCount = projectTx.length;
    confidenceScore = Math.min(98, 85 + projectTx.length * 2);
  } else if (districtTx.length > 0) {
    // Fallback to district average PSF
    const totalPsf = districtTx.reduce((sum, tx) => sum + tx.psf, 0);
    basePsf = totalPsf / districtTx.length;
    comparableTransactionsCount = districtTx.length;
    confidenceScore = Math.min(85, 60 + districtTx.length * 1.5);
  } else {
    // Default fallback values based on property types in Singapore
    const fallbackPsfMap: Record<string, number> = {
      'HDB': 600,
      'EC': 1300,
      'Condo': 2100,
      'Commercial': 4000,
      'Landed': 1800
    };
    basePsf = fallbackPsfMap[req.propertyType] || 1500;
    comparableTransactionsCount = 0;
    confidenceScore = 45;
  }

  // Adjustments based on floor level
  let floorAdjustment = 1.0;
  if (req.floor === 'High') floorAdjustment = 1.06;
  if (req.floor === 'Low') floorAdjustment = 0.94;

  const finalPsf = Math.round(basePsf * floorAdjustment);
  const estimatedValue = finalPsf * req.sizeSqft;

  // Calculate high/low bounds based on confidence
  const variancePercentage = (100 - confidenceScore) / 100 * 0.15 + 0.03; // wider range for lower confidence
  const lowEstimateRange = Math.round(estimatedValue * (1 - variancePercentage));
  const highEstimateRange = Math.round(estimatedValue * (1 + variancePercentage));

  let confidenceLabel: 'High' | 'Medium' | 'Low' = 'Medium';
  if (confidenceScore > 85) confidenceLabel = 'High';
  else if (confidenceScore < 60) confidenceLabel = 'Low';

  // District average calculation for reference
  const dTx = mockTransactions.filter(tx => tx.district === req.district);
  const districtAveragePsf = dTx.length > 0 
    ? Math.round(dTx.reduce((sum, tx) => sum + tx.psf, 0) / dTx.length)
    : Math.round(basePsf);

  return {
    estimatedValue,
    estimatedPsf: finalPsf,
    confidenceScore,
    confidenceLabel,
    comparableTransactionsCount,
    lowEstimateRange,
    highEstimateRange,
    districtAveragePsf
  };
};
