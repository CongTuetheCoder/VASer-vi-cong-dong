document.addEventListener("DOMContentLoaded", () => {
	const msSignup = document.getElementById("microsoftSignup");
	const ggSignup = document.getElementById("googleSignup");
	const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

	async function upsertMockApiUser(profile) {
		// profile = { provider, id, name, email, picture }
		const resp = await fetch(usersAPI);
		const users = await resp.json();

		// find existing user by provider/id or email
		const existing = users.find(
			(u) => u.email && u.email === profile.email
		);

		if (existing) {
			const updated = Object.assign({}, existing, {
				provider: profile.provider,
				providerId: profile.id,
				name: profile.name,
				email: profile.email,
				picture: profile.picture,
			});
			await fetch(`${usersAPI}/${existing.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updated),
			});
			return updated;
		} else {
			const createPayload = Object.assign({}, profile, {
				username: profile.email || profile.name,
				email: profile.email,
				salt: "", // OAuth users don't need salt/hash
				hash: "",
				type: "googleAccount",
				data: {
					currentUnit: "1",
					lesson: "1",
				},
				classList: [],
			});
			const createResp = await fetch(usersAPI, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(createPayload),
			});
			return await createResp.json();
		}
	}

	// helpers
	function decodeJwtPayload(jwt) {
		try {
			const base64Url = jwt.split(".")[1] || "";
			const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
			const jsonPayload = decodeURIComponent(
				atob(base64)
					.split("")
					.map(
						(c) =>
							"%" +
							("00" + c.charCodeAt(0).toString(16)).slice(-2)
					)
					.join("")
			);
			return JSON.parse(jsonPayload);
		} catch {
			return null;
		}
	}

	// Google handler
	function handleGoogleCredential(response) {
		const payload = decodeJwtPayload(response?.credential);
		if (!payload) {
			console.error("Invalid Google credential");
			alert("Google sign-in failed");
			return;
		}
		const profile = {
			username: payload.given_name || payload.name,
			type: "googleAccount",
			id: payload.sub,
			email: payload.email,
		};
		upsertMockApiUser(profile).then(() => {
			window.location.href = "home.html"; // change as needed
		});
	}

	(async function tryInitGoogle() {
		const start = Date.now();
		while (!window.google && Date.now() - start < 2000) {
			await new Promise((r) => setTimeout(r, 50));
		}
		if (window.google && ggSignup) {
			google.accounts.id.initialize({
				client_id: "YOUR_GOOGLE_CLIENT_ID", // replace
				callback: handleGoogleCredential,
			});
			google.accounts.id.renderButton(ggSignup, {
				theme: "outline",
				size: "large",
			});
		}
	})();

	// Microsoft (MSAL)
	(async function tryInitMsal() {
		const start = Date.now();
		while (!window.msal && Date.now() - start < 2000) {
			await new Promise((r) => setTimeout(r, 50));
		}
		if (!window.msal || !msSignup) return;

		const msalInstance = new msal.PublicClientApplication({
			auth: {
				clientId: "YOUR_MS_CLIENT_ID", // replace
				redirectUri: window.location.origin + "/register.html",
			},
		});

		msSignup.addEventListener("click", async () => {
			try {
				const loginResp = await msalInstance.loginPopup({
					scopes: ["openid", "profile", "email"],
				});
				const claims = loginResp.idTokenClaims || {};
				const profile = {
					username: claims.name || claims.preferred_username,
					email: claims.email || claims.preferred_username,
					salt: "", // OAuth users don't need salt/hash
					hash: "",
					type: "msAccount",
					data: {
						currentUnit: "1",
						lesson: "1",
					},
					classList: [],
				};
				await upsertMockApiUser(profile);
				window.location.href = "home.html"; // change as needed
			} catch (err) {
				console.error("MS login failed:", err);
				alert("Microsoft sign-in failed");
			}
		});
	})();
});
