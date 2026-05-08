const { ROLE_NAMES } = require("../config/constants");

function hasRole(user, roleName) {
  return user.roles.includes(roleName);
}

function canViewAllProducts(user) {
  return (
    hasRole(user, ROLE_NAMES.ADMIN) || hasRole(user, ROLE_NAMES.AUDITOR)
  );
}

function canViewProduct(user, product) {
  if (canViewAllProducts(user)) {
    return true;
  }

  return (
    product.tiendaId === user.tiendaId &&
    (hasRole(user, ROLE_NAMES.MANAGER) || hasRole(user, ROLE_NAMES.EMPLOYEE))
  );
}

function authorizeProductCreate(user, payload) {
  if (hasRole(user, ROLE_NAMES.ADMIN)) {
    return { allowed: true, sanitizedPayload: payload };
  }

  if (hasRole(user, ROLE_NAMES.MANAGER)) {
    if (payload.tiendaId !== user.tiendaId) {
      return {
        allowed: false,
        reason: "Los gerentes solo pueden crear productos en su tienda.",
      };
    }
    return { allowed: true, sanitizedPayload: payload };
  }

  if (hasRole(user, ROLE_NAMES.EMPLOYEE)) {
    if (payload.tiendaId !== user.tiendaId) {
      return {
        allowed: false,
        reason: "Los empleados solo pueden crear productos en su tienda.",
      };
    }
    if (payload.esPremium) {
      return {
        allowed: false,
        reason: "Los empleados no pueden crear productos premium.",
      };
    }
    return { allowed: true, sanitizedPayload: payload };
  }

  return {
    allowed: false,
    reason: "El usuario no tiene permisos para crear productos.",
  };
}

function authorizeProductUpdate(user, currentProduct, updates) {
  const keys = Object.keys(updates);

  if (keys.length === 0) {
    return {
      allowed: false,
      reason: "No se recibieron campos válidos para actualizar.",
    };
  }

  if (hasRole(user, ROLE_NAMES.ADMIN)) {
    return { allowed: true, sanitizedPayload: updates };
  }

  if (hasRole(user, ROLE_NAMES.MANAGER)) {
    if (currentProduct.tiendaId !== user.tiendaId) {
      return {
        allowed: false,
        reason: "Los gerentes solo pueden editar productos de su tienda.",
      };
    }

    if (keys.includes("categoria") || keys.includes("tiendaId")) {
      return {
        allowed: false,
        reason: "Los gerentes no pueden cambiar la categoría ni la tienda.",
      };
    }

    return { allowed: true, sanitizedPayload: updates };
  }

  if (hasRole(user, ROLE_NAMES.EMPLOYEE)) {
    if (currentProduct.tiendaId !== user.tiendaId) {
      return {
        allowed: false,
        reason: "Los empleados solo pueden editar productos de su tienda.",
      };
    }

    if (keys.length !== 1 || keys[0] !== "stock") {
      return {
        allowed: false,
        reason: "Los empleados solo pueden actualizar el stock.",
      };
    }

    return {
      allowed: true,
      sanitizedPayload: { stock: updates.stock },
    };
  }

  return {
    allowed: false,
    reason: "El usuario no tiene permisos para actualizar productos.",
  };
}

function authorizeProductDelete(user, product) {
  if (hasRole(user, ROLE_NAMES.ADMIN)) {
    return { allowed: true };
  }

  if (hasRole(user, ROLE_NAMES.MANAGER)) {
    if (product.tiendaId !== user.tiendaId) {
      return {
        allowed: false,
        reason: "Los gerentes solo pueden eliminar productos de su tienda.",
      };
    }

    if (product.esPremium) {
      return {
        allowed: false,
        reason: "Los gerentes no pueden eliminar productos premium.",
      };
    }

    return { allowed: true };
  }

  if (hasRole(user, ROLE_NAMES.EMPLOYEE)) {
    return {
      allowed: false,
      reason: "Los empleados no pueden eliminar productos.",
    };
  }

  return {
    allowed: false,
    reason: "El usuario no tiene permisos para eliminar productos.",
  };
}

module.exports = {
  canViewProduct,
  canViewAllProducts,
  authorizeProductCreate,
  authorizeProductUpdate,
  authorizeProductDelete,
};
