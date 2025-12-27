const check = (user, action, data) => {
	const userPermissions = user?.permissions || [];

	// Super Admin fallback
	if (user?.profile === "admin") return true;

	if (userPermissions.includes(action)) {
		return true;
	}

	return false;
};

const Can = ({ user, perform, data, yes, no }) =>
	check(user, perform, data) ? yes() : no();

Can.defaultProps = {
	yes: () => null,
	no: () => null,
};

export { Can };
