const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function applyEffect() {
	const title = document.getElementById("animated");
	let iterations = 0;
	const interval = setInterval(() => {
		title.innerText = title.innerText
			.split("")
			.map((letter, index) => {
				if (index < iterations) return title.dataset.value[index];
				return LETTERS[Math.floor(Math.random() * 52)];
			})
			.join("");

		if (iterations >= title.dataset.value.length) {
			title.innerText = title.dataset.value;
			title.classList.add("animation-done");
			clearInterval(interval);
		}

		iterations += 1 / 8;
	}, 10);
}

applyEffect();
