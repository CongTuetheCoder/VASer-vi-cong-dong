document.addEventListener("DOMContentLoaded", () => {
	const msSignup = document.getElementById("microsoftSignup");
	const ggSignup = document.getElementById("googleSignup");
	const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

	async function upsertMockApiUser(profile) {
		// profile = { provider, providerId, name, email, picture, ... }
		const resp = await fetch(usersAPI);
		const users = await resp.json();

		// find existing user by email
		const existing = users.find(
			(u) => u.email && u.email === profile.email
		);

		if (existing) {
			// --- UPDATE EXISTING USER LOGIC ---
			// (Keeping extra fields here ensures you retain data integrity if they exist in DB)
			const updated = {
				...existing,
				// Note: We are keeping the provider/name/picture fields in the update
				// because they might be necessary for logging in later or displaying info.
				provider: profile.provider,
				providerId: profile.providerId,
				name: profile.name,
				picture: profile.picture,
				lastLogin: new Date().toISOString(),
			};

			await fetch(`${usersAPI}/${existing.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updated),
			});
			return updated;
		} else {
			// --- CREATE NEW USER LOGIC (STRICTLY ADHERING TO YOUR SCHEMA) ---
			const createPayload = {
				// Use email as a reliable username if name isn't suitable, or profile.name
				username: profile.email || profile.name,
				salt: "", // Required by your schema
				hash: "", // Required by your schema
				type: "googleAccount", // Strictly set as requested
				data: {
					currentUnit: "1",
					lesson: "1",
				},
				classList: [], // Required by your schema
				email: profile.email, // Ensure email is included
			};

			const createResp = await fetch(usersAPI, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(createPayload),
			});
			return await createResp.json();
		}
	}

	async function handleGoogleToken(tokenResponse) {
		if (tokenResponse && tokenResponse.access_token) {
			try {
				const userInfoResp = await fetch(
					"https://www.googleapis.com/oauth2/v3/userinfo",
					{
						headers: {
							Authorization: `Bearer ${tokenResponse.access_token}`,
						},
					}
				);
				const googleUser = await userInfoResp.json();

				const profile = {
					provider: "Google",
					providerId: googleUser.sub,
					name: googleUser.name,
					email: googleUser.email,
					picture: googleUser.picture,
				};

				upsertMockApiUser(profile).then((user) => {
					setCookie("user", user.username);
					window.location.href = "http://127.0.0.1:5500/home.html";
				});
			} catch (err) {
				console.error("Failed to fetch Google profile:", err);
			}
		}
	}

	(async function initGoogleCustom() {
		const start = Date.now();
		while (!window.google && Date.now() - start < 3000) {
			await new Promise((r) => setTimeout(r, 100));
		}

		if (!window.google || !ggSignup) return;

		const client = google.accounts.oauth2.initTokenClient({
			client_id:
				"883471007794-c05ngp5k0gglnvbnsuo6b972oadumdrt.apps.googleusercontent.com",
			scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
			callback: handleGoogleToken,
		});

		ggSignup.onclick = () => {
			client.requestAccessToken();
		};
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
