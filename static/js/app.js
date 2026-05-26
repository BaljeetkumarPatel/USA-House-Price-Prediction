const form = document.getElementById("prediction-form");
const loading = document.getElementById("loading");
const resultPrice = document.getElementById("result-price");
const resultConfidence = document.getElementById("result-confidence");
const resultSummary = document.getElementById("result-summary");
const factorList = document.getElementById("factor-list");

const fields = [
  ["incomeRange", "income"],
  ["ageRange", "age"],
  ["roomsRange", "rooms"],
  ["populationRange", "population"],
];

fields.forEach(([rangeId, numId]) => {
  const rangeEl = document.getElementById(rangeId);
  const numEl = document.getElementById(numId);
  rangeEl.addEventListener("input", () => (numEl.value = rangeEl.value));
  numEl.addEventListener("input", () => (rangeEl.value = numEl.value));
});

function usd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const featureChart = new Chart(document.getElementById("featureChart"), {
  type: "bar",
  data: {
    labels: ["Income", "House Age", "Rooms", "Population"],
    datasets: [{ label: "Feature Impact", data: [0, 0, 0, 0], backgroundColor: ["#3fd2c7", "#7be495", "#f5c26b", "#5fa8d3"] }],
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: "#c4dced" }, grid: { color: "rgba(255,255,255,0.08)" } }, x: { ticks: { color: "#c4dced" }, grid: { display: false } } } },
});

const marketChart = new Chart(document.getElementById("marketChart"), {
  type: "radar",
  data: {
    labels: ["Income", "Age", "Rooms", "Population", "Demand", "Growth"],
    datasets: [{ label: "Market Signal", data: [60, 55, 58, 62, 68, 64], borderColor: "#f5c26b", backgroundColor: "rgba(245,194,107,0.2)" }],
  },
  options: { scales: { r: { grid: { color: "rgba(255,255,255,.15)" }, pointLabels: { color: "#c4dced" }, ticks: { display: false } } }, plugins: { legend: { labels: { color: "#c4dced" } } } },
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  loading.classList.remove("hidden");

  const payload = {
    "Avg. Area Income": parseFloat(document.getElementById("income").value),
    "Avg. Area House Age": parseFloat(document.getElementById("age").value),
    "Avg. Area Number of Rooms": parseFloat(document.getElementById("rooms").value),
    "Area Population": parseFloat(document.getElementById("population").value),
  };

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Prediction failed");

    resultPrice.textContent = usd(data.predicted_price);
    resultConfidence.textContent = `Confidence: ${data.confidence}%`;
    resultSummary.textContent = data.insight_summary;

    factorList.innerHTML = "";
    const featureImpactData = [];
    data.factor_analysis.forEach((item) => {
      featureImpactData.push((item.impactStrength * 100).toFixed(2));
      const el = document.createElement("div");
      el.className = "factor";
      el.textContent = `${item.feature}: ${item.impactDirection} impact | importance ${(item.importance * 100).toFixed(1)}%`;
      factorList.appendChild(el);
    });

    featureChart.data.datasets[0].data = featureImpactData;
    featureChart.update();

    gsap.fromTo(".result-panel", { scale: 0.98, boxShadow: "0 0 0 rgba(0,0,0,0)" }, { scale: 1, boxShadow: "0 0 35px rgba(63,210,199,.35)", duration: 0.5 });
  } catch (err) {
    resultSummary.textContent = err.message;
  } finally {
    loading.classList.add("hidden");
  }
});

function animateCounter(id, to, suffix = "+") {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(to / 60);
  const timer = setInterval(() => {
    current += step;
    if (current >= to) {
      current = to;
      clearInterval(timer);
    }
    el.textContent = `${current}${suffix}`;
  }, 30);
}

AOS.init({ once: true, duration: 700 });
animateCounter("counter-model", 1250);
animateCounter("counter-accuracy", 96, "%");
animateCounter("counter-markets", 50);

gsap.from(".hero-text h1", { y: 20, opacity: 0, duration: 0.8 });
