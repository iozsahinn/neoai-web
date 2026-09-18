import { useMemo } from "react";

export function LusDecisionTreeViewer({
  nodeProbs,
  resultsMap,
  selectedDiagnosisId,
  onSelectDiagnosis
}) {
  const activeDiagId = selectedDiagnosisId;

  // Active path node checks based on selected diagnosis
  const isPathActive = useMemo(() => {
    return (branchKey) => {
      if (!activeDiagId) return false;
      switch (activeDiagId) {
        case "normal":
          return ["root_present", "node_a_pres_present"].includes(branchKey);
        case "ttn":
          return ["root_present", "node_a_pres_absent", "node_b_prof_present"].includes(branchKey);
        case "mas":
          return ["root_present", "node_a_pres_absent", "node_b_prof_absent"].includes(branchKey);
        case "confirmed_ptx":
          return ["root_absent", "node_a_abs_present", "node_lp_present"].includes(branchKey);
        case "possible_ptx":
          return ["root_absent", "node_a_abs_present", "node_lp_absent"].includes(branchKey);
        case "pleural_effusion":
          return ["root_absent", "node_a_abs_absent", "node_az_present"].includes(branchKey);
        case "rds":
          return ["root_absent", "node_a_abs_absent", "node_az_absent", "node_bc_present"].includes(branchKey);
        case "pneumonia":
          return ["root_absent", "node_a_abs_absent", "node_az_absent", "node_bc_absent", "node_ss_present"].includes(branchKey);
        case "atelectasis":
          return ["root_absent", "node_a_abs_absent", "node_az_absent", "node_bc_absent", "node_ss_absent"].includes(branchKey);
        default:
          return false;
      }
    };
  }, [activeDiagId]);

  function formatProb(p) {
    return `${Math.round((p ?? 0) * 100)}%`;
  }

  return (
    <div className="lus-diagram-wrapper">
      <div className="lus-diagram-titlebar">
        <h2>ULTRASONOGRAPHY: Algorithms</h2>
        <span className="lus-diagram-caption">Neonatal Lung Ultrasound Decision Tree &amp; Probabilistic Inference Map</span>
      </div>

      <div className="lus-diagram-canvas">
        {/* ================= LEVEL 1: ROOT ================= */}
        <div className="diagram-row row-root">
          <div className="diagram-connector-root">
            <div className="lus-box decision-box root-box">
              <span className="box-title">Lung sliding</span>
              <div className="box-sub-probs">
                <span className="prob-badge pos">Present: {formatProb(nodeProbs.lungSliding)}</span>
                <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.lungSliding)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROOT FORK ARMS */}
        <div className="diagram-fork-lines">
          <div className={`fork-branch branch-left${isPathActive("root_present") ? " active-path" : ""}`}>
            <span className="fork-tag">Present ({formatProb(nodeProbs.lungSliding)})</span>
            <div className="line-h" />
            <div className="line-v" />
          </div>
          <div className={`fork-branch branch-right${isPathActive("root_absent") ? " active-path" : ""}`}>
            <span className="fork-tag">Absent ({formatProb(1 - nodeProbs.lungSliding)})</span>
            <div className="line-h" />
            <div className="line-v" />
          </div>
        </div>

        {/* ================= MAIN SPLIT: LEFT (SLIDING +) vs RIGHT (SLIDING -) ================= */}
        <div className="diagram-main-split">
          {/* ================= LEFT MAIN WING ================= */}
          <div className={`diagram-wing wing-left${isPathActive("root_present") ? " active-wing" : ""}`}>
            {/* A lines (Present side) */}
            <div className="diagram-node-center">
              <div className="lus-box decision-box">
                <span className="box-title">A lines</span>
                <div className="box-sub-probs">
                  <span className="prob-badge pos">Present: {formatProb(nodeProbs.aLinesSlidingPresent)}</span>
                  <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.aLinesSlidingPresent)}</span>
                </div>
              </div>
            </div>

            {/* Left Sub-Fork: A lines -> Absent (Left) vs Present (Right: Normal lung) */}
            <div className="diagram-left-subgrid">
              {/* Absent Sub-Branch: B profile */}
              <div className={`sub-branch-block${isPathActive("node_a_pres_absent") ? " active-path" : ""}`}>
                <div className="sub-tag-line">Absent ({formatProb(1 - nodeProbs.aLinesSlidingPresent)})</div>
                
                <div className="lus-box decision-box b-profile-box">
                  <span className="box-title">B profile with double lung point</span>
                  <div className="box-sub-probs">
                    <span className="prob-badge pos">Present: {formatProb(nodeProbs.bProfile)}</span>
                    <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.bProfile)}</span>
                  </div>
                </div>

                {/* B Profile Sub-fork: MAS (Absent) vs TTN (Present) */}
                <div className="mas-ttn-grid">
                  {/* MAS */}
                  <div className="leaf-container">
                    <span className="sub-tag-line mini">Absent</span>
                    <div
                      className={`lus-box outcome-box mas-box${activeDiagId === "mas" ? " selected" : ""}`}
                      onClick={() => onSelectDiagnosis("mas")}
                    >
                      <span className="outcome-name">MAS</span>
                      <span className="outcome-score">{formatProb(resultsMap.mas)}</span>
                    </div>
                    <div className="severity-callout">
                      Severity ranges from nonspecific B-profile to irregular subpleural consolidations with air bronchograms
                    </div>
                  </div>

                  {/* TTN */}
                  <div className="leaf-container">
                    <span className="sub-tag-line mini">Present</span>
                    <div
                      className={`lus-box outcome-box ttn-box${activeDiagId === "ttn" ? " selected" : ""}`}
                      onClick={() => onSelectDiagnosis("ttn")}
                    >
                      <span className="outcome-name">TTN</span>
                      <span className="outcome-score">{formatProb(resultsMap.ttn)}</span>
                    </div>
                    <div className="severity-callout">
                      Severity ranges from the mild B-profile +/- 'double lung point' to the 'white lung'
                    </div>
                  </div>
                </div>
              </div>

              {/* Present Sub-Branch: Normal Lung */}
              <div className={`leaf-container normal-container${isPathActive("node_a_pres_present") ? " active-path" : ""}`}>
                <span className="sub-tag-line">Present ({formatProb(nodeProbs.aLinesSlidingPresent)})</span>
                <div
                  className={`lus-box outcome-box normal-box${activeDiagId === "normal" ? " selected" : ""}`}
                  onClick={() => onSelectDiagnosis("normal")}
                >
                  <span className="outcome-name">Normal lung</span>
                  <span className="outcome-score">{formatProb(resultsMap.normal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT MAIN WING ================= */}
          <div className={`diagram-wing wing-right${isPathActive("root_absent") ? " active-wing" : ""}`}>
            {/* A lines (Absent side) */}
            <div className="diagram-node-center">
              <div className="lus-box decision-box">
                <span className="box-title">A lines</span>
                <div className="box-sub-probs">
                  <span className="prob-badge pos">Present: {formatProb(nodeProbs.aLinesSlidingAbsent)}</span>
                  <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.aLinesSlidingAbsent)}</span>
                </div>
              </div>
            </div>

            {/* Right Sub-Split: Present (Pneumothorax) vs Absent (Effusion/Consolidation) */}
            <div className="diagram-right-subgrid">
              {/* Branch A: A-lines Present -> Lung Point */}
              <div className={`sub-branch-block ptx-branch${isPathActive("node_a_abs_present") ? " active-path" : ""}`}>
                <span className="sub-tag-line">Present ({formatProb(nodeProbs.aLinesSlidingAbsent)})</span>

                <div className="lus-box decision-box lung-point-box">
                  <span className="box-title">Lung point</span>
                  <div className="box-sub-probs">
                    <span className="prob-badge pos">Present: {formatProb(nodeProbs.lungPoint)}</span>
                    <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.lungPoint)}</span>
                  </div>
                </div>

                <div className="ptx-leaf-grid">
                  {/* Confirmed PTX */}
                  <div className="leaf-container">
                    <span className="sub-tag-line mini">Present</span>
                    <div
                      className={`lus-box outcome-box ptx-confirmed-box${activeDiagId === "confirmed_ptx" ? " selected" : ""}`}
                      onClick={() => onSelectDiagnosis("confirmed_ptx")}
                    >
                      <span className="outcome-name">Confirmed Pneumothorax</span>
                      <span className="outcome-score">{formatProb(resultsMap.confirmed_ptx)}</span>
                    </div>
                  </div>

                  {/* Possible PTX */}
                  <div className="leaf-container">
                    <span className="sub-tag-line mini">Absent</span>
                    <div
                      className={`lus-box outcome-box ptx-possible-box${activeDiagId === "possible_ptx" ? " selected" : ""}`}
                      onClick={() => onSelectDiagnosis("possible_ptx")}
                    >
                      <span className="outcome-name">Possible Pneumothorax, + Stratosphere sign</span>
                      <span className="outcome-score">{formatProb(resultsMap.possible_ptx)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch B: A-lines Absent -> Anechoic Zone -> Consolidation */}
              <div className={`sub-branch-block effusion-consolidation-branch${isPathActive("node_a_abs_absent") ? " active-path" : ""}`}>
                <span className="sub-tag-line">Absent ({formatProb(1 - nodeProbs.aLinesSlidingAbsent)})</span>

                <div className="anechoic-effusion-row">
                  <div className="lus-box decision-box anechoic-box">
                    <span className="box-title">Anechoic zone +/- Jellyfish sign, Sinusoid sign, Quad sign</span>
                    <div className="box-sub-probs">
                      <span className="prob-badge pos">Present: {formatProb(nodeProbs.anechoicZone)}</span>
                      <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.anechoicZone)}</span>
                    </div>
                  </div>

                  <div className="effusion-leaf-wrap">
                    <span className="sub-tag-line mini">Present</span>
                    <div
                      className={`lus-box outcome-box effusion-box${activeDiagId === "pleural_effusion" ? " selected" : ""}`}
                      onClick={() => onSelectDiagnosis("pleural_effusion")}
                    >
                      <span className="outcome-name">Pleural effusion</span>
                      <span className="outcome-score">{formatProb(resultsMap.pleural_effusion)}</span>
                    </div>
                  </div>
                </div>

                {/* Consolidation Branch */}
                <div className={`consolidation-subgrid${isPathActive("node_az_absent") ? " active-path" : ""}`}>
                  <span className="sub-tag-line">Absent ({formatProb(1 - nodeProbs.anechoicZone)})</span>

                  <div className="lus-box decision-box consolidation-box">
                    <span className="box-title">Bilateral/uniform consolidation</span>
                    <div className="box-sub-probs">
                      <span className="prob-badge pos">Present: {formatProb(nodeProbs.bilateralConsolidation)}</span>
                      <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.bilateralConsolidation)}</span>
                    </div>
                  </div>

                  <div className="rds-shred-split">
                    {/* RDS */}
                    <div className="leaf-container rds-container">
                      <span className="sub-tag-line mini">Present</span>
                      <div
                        className={`lus-box outcome-box rds-box${activeDiagId === "rds" ? " selected" : ""}`}
                        onClick={() => onSelectDiagnosis("rds")}
                      >
                        <span className="outcome-name">RDS</span>
                        <span className="outcome-score">{formatProb(resultsMap.rds)}</span>
                      </div>
                      <div className="severity-callout">
                        Severity ranges from B-profile to 'white lung' with static air bronchograms and lung pulse sign
                      </div>
                    </div>

                    {/* Shred sign -> Pneumonia & Atelectasis */}
                    <div className={`shred-container${isPathActive("node_bc_absent") ? " active-path" : ""}`}>
                      <span className="sub-tag-line mini">Absent</span>

                      <div className="lus-box decision-box shred-box">
                        <span className="box-title">Shred sign and/or dynamic air/fluid bronchograms</span>
                        <div className="box-sub-probs">
                          <span className="prob-badge pos">Present: {formatProb(nodeProbs.shredSign)}</span>
                          <span className="prob-badge neg">Absent: {formatProb(1 - nodeProbs.shredSign)}</span>
                        </div>
                      </div>

                      <div className="pneumonia-atelectasis-grid">
                        {/* Pneumonia */}
                        <div className="leaf-container">
                          <span className="sub-tag-line mini">Present</span>
                          <div
                            className={`lus-box outcome-box pneumonia-box${activeDiagId === "pneumonia" ? " selected" : ""}`}
                            onClick={() => onSelectDiagnosis("pneumonia")}
                          >
                            <span className="outcome-name">Pneumonia</span>
                            <span className="outcome-score">{formatProb(resultsMap.pneumonia)}</span>
                          </div>
                          <div className="severity-callout">
                            Irregular pleura present. B-profile present if reactive edema.
                            <strong>NOTE:</strong> 25% of pneumonias have lung sliding present. Deeper pneumonias may be missed.
                          </div>
                        </div>

                        {/* Atelectasis */}
                        <div className="leaf-container">
                          <span className="sub-tag-line mini">Absent</span>
                          <div
                            className={`lus-box outcome-box atelectasis-box${activeDiagId === "atelectasis" ? " selected" : ""}`}
                            onClick={() => onSelectDiagnosis("atelectasis")}
                          >
                            <span className="outcome-name">Atelectasis</span>
                            <span className="outcome-score">{formatProb(resultsMap.atelectasis)}</span>
                          </div>
                          <div className="severity-callout">
                            Severity ranges from consolidation with static air bronchograms to 'white lung' with lung pulse sign in complete atelectasis
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= DIAGRAM FOOTER & REFERENCE ================= */}
        <div className="diagram-reference-footer">
          <div className="reference-box">
            <h4>LUS - IMMEDIATE POSTNATAL RESPIRATORY DISTRESS</h4>
            <p><strong>MAS</strong> – Meconium Aspiration Syndrome</p>
            <p><strong>TTN</strong> – Transient Tachypnea of Newborn</p>
            <p><strong>RDS</strong> – Respiratory Distress Syndrome</p>
          </div>
          <div className="citation-text">
            Kurepa D, Zaghloul N, Watkins L, Liu J. Neonatal lung ultrasound exam guidelines. J Perinatol. 2018 Jan;38(1):11-22.
          </div>
        </div>
      </div>
    </div>
  );
}
