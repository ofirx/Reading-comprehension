/**
 * Testing page: Wordwall embed loader + 3-part self-graded quiz + Chart.js results.
 */
(function () {
  var ANSWERS = {
    q1: "b",
    q2: "a",
    q3: "c",
    q4: "b",
    q5: "a",
    q6: "d",
    q7: "b",
    q8: "c",
    q9: "a",
    q10: "b",
  };

  var PARTS = [
    { id: 1, keys: ["q1", "q2", "q3", "q4"], label: "Part 1" },
    { id: 2, keys: ["q5", "q6", "q7"], label: "Part 2" },
    { id: 3, keys: ["q8", "q9", "q10"], label: "Part 3" },
  ];

  var embedBtn = document.getElementById("testingEmbedLoad");
  var embedUrl = document.getElementById("testingEmbedUrl");
  var embedFrame = document.getElementById("testingEmbedFrame");

  if (embedBtn && embedUrl && embedFrame) {
    embedBtn.addEventListener("click", function () {
      var u = (embedUrl.value || "").trim();
      if (!u) return;
      embedFrame.src = u;
    });
  }

  var panes = document.querySelectorAll(".quiz-pane");
  var stepBtns = document.querySelectorAll(".quiz-step-btn");
  var btnPrev = document.getElementById("quizBtnPrev");
  var btnNext = document.getElementById("quizBtnNext");
  var btnSubmit = document.getElementById("quizBtnSubmit");
  var current = 0;
  var totalSteps = panes.length;

  function showStep(i) {
    current = Math.max(0, Math.min(i, totalSteps - 1));
    panes.forEach(function (p, idx) {
      p.hidden = idx !== current;
    });
    stepBtns.forEach(function (b, idx) {
      b.classList.toggle("is-active", idx === current);
      b.classList.toggle("is-done", idx < current);
    });
    if (btnPrev) btnPrev.disabled = current === 0;
    if (btnNext) {
      btnNext.hidden = current >= totalSteps - 1;
    }
    if (btnSubmit) {
      btnSubmit.hidden = current < totalSteps - 1;
    }
  }

  stepBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var n = parseInt(b.getAttribute("data-step"), 10) - 1;
      if (!isNaN(n)) showStep(n);
    });
  });

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      showStep(current - 1);
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function () {
      showStep(current + 1);
    });
  }

  var chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(function (c) {
      if (c) c.destroy();
    });
    chartInstances = [];
  }

  function gradeMc() {
    var correct = 0;
    var total = Object.keys(ANSWERS).length;
    var byPart = [{ c: 0, t: 0 }, { c: 0, t: 0 }, { c: 0, t: 0 }];
    PARTS.forEach(function (part, pi) {
      part.keys.forEach(function (key) {
        byPart[pi].t++;
        var el = document.querySelector('input[name="' + key + '"]:checked');
        var v = el ? el.value : "";
        if (v === ANSWERS[key]) {
          correct++;
          byPart[pi].c++;
        }
      });
    });
    return { correct: correct, total: total, byPart: byPart };
  }

  function renderCharts(r) {
    destroyCharts();
    var green = "#2e7d32";
    var red = "#c62828";
    var Chart = window.Chart;
    if (!Chart) return;

    PARTS.forEach(function (part, idx) {
      var bp = r.byPart[idx];
      var w = bp.t - bp.c;
      var canvas = document.getElementById("chartPart" + part.id);
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      chartInstances.push(
        new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["Correct", "Incorrect"],
            datasets: [
              {
                data: [bp.c, w],
                backgroundColor: [green, red],
                borderWidth: 1,
                borderColor: "#fff",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    var n = ctx.raw;
                    var pct = bp.t ? ((n / bp.t) * 100).toFixed(0) : "0";
                    return ctx.label + ": " + n + " (" + pct + "%)";
                  },
                },
              },
            },
          },
        })
      );
      var statEl = document.getElementById("statsPart" + part.id);
      if (statEl) {
        statEl.textContent =
          "Correct: " + bp.c + "/" + bp.t + " · Incorrect: " + w + "/" + bp.t;
      }
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener("click", function () {
      var r = gradeMc();
      var scoreEl = document.getElementById("quizScoreText");
      var resultsEl = document.getElementById("quizResults");
      if (scoreEl) {
        scoreEl.textContent =
          "Overall score: " + r.correct + " / " + r.total + " (" +
          Math.round((r.correct / r.total) * 100) +
          "/100)";
      }
      if (resultsEl) {
        resultsEl.hidden = false;
        renderCharts(r);
        resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  showStep(0);
})();
