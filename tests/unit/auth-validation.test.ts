import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  usernameSchema,
} from "@/app/lib/validations/auth";

describe("Auth Validation Schemas", () => {
  // ---------------------------------------------------------------------------
  // usernameSchema
  // ---------------------------------------------------------------------------
  describe("usernameSchema", () => {
    it("accepts a valid username", () => {
      expect(usernameSchema.parse("john_doe")).toBe("john_doe");
    });

    it("lowercases", () => {
      expect(usernameSchema.parse("JohnDoe")).toBe("johndoe");
    });

    it("rejects username shorter than 3 characters", () => {
      expect(() => usernameSchema.parse("ab")).toThrow();
    });

    it("rejects username longer than 30 characters", () => {
      expect(() => usernameSchema.parse("a".repeat(31))).toThrow();
    });

    it("rejects special characters (spaces, hyphens, etc.)", () => {
      expect(() => usernameSchema.parse("john-doe")).toThrow();
      expect(() => usernameSchema.parse("john doe")).toThrow();
      expect(() => usernameSchema.parse("john@doe")).toThrow();
    });

    it("allows underscores and digits", () => {
      expect(usernameSchema.parse("user_123")).toBe("user_123");
    });
  });

  // ---------------------------------------------------------------------------
  // signupSchema
  // ---------------------------------------------------------------------------
  describe("signupSchema", () => {
    const validSignup = {
      email: "test@example.com",
      username: "testuser",
      password: "Password1",
      confirmPassword: "Password1",
      firstName: "John",
      lastName: "Doe",
    };

    it("accepts valid signup data", () => {
      const result = signupSchema.parse(validSignup);
      expect(result.email).toBe("test@example.com");
      expect(result.username).toBe("testuser");
      expect(result.firstName).toBe("John");
    });

    it("lowercases email", () => {
      const result = signupSchema.parse({
        ...validSignup,
        email: "TEST@EXAMPLE.COM",
      });
      expect(result.email).toBe("test@example.com");
    });

    it("rejects invalid email", () => {
      expect(() =>
        signupSchema.parse({ ...validSignup, email: "not-an-email" })
      ).toThrow();
    });

    it("rejects empty email", () => {
      expect(() => signupSchema.parse({ ...validSignup, email: "" })).toThrow();
    });

    it("rejects password shorter than 8 characters", () => {
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          password: "Pass1",
          confirmPassword: "Pass1",
        })
      ).toThrow();
    });

    it("rejects password longer than 100 characters", () => {
      const longPassword = "Aa1" + "a".repeat(98);
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          password: longPassword,
          confirmPassword: longPassword,
        })
      ).toThrow();
    });

    it("rejects password without uppercase letter", () => {
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          password: "password1",
          confirmPassword: "password1",
        })
      ).toThrow();
    });

    it("rejects password without lowercase letter", () => {
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          password: "PASSWORD1",
          confirmPassword: "PASSWORD1",
        })
      ).toThrow();
    });

    it("rejects password without digit", () => {
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          password: "PasswordOnly",
          confirmPassword: "PasswordOnly",
        })
      ).toThrow();
    });

    it("rejects mismatched passwords", () => {
      expect(() =>
        signupSchema.parse({
          ...validSignup,
          confirmPassword: "Different1",
        })
      ).toThrow();
    });

    it("rejects empty first name", () => {
      expect(() =>
        signupSchema.parse({ ...validSignup, firstName: "" })
      ).toThrow();
    });

    it("rejects first name longer than 50 characters", () => {
      expect(() =>
        signupSchema.parse({ ...validSignup, firstName: "A".repeat(51) })
      ).toThrow();
    });

    it("rejects empty last name", () => {
      expect(() =>
        signupSchema.parse({ ...validSignup, lastName: "" })
      ).toThrow();
    });

    it("rejects missing fields", () => {
      expect(() => signupSchema.parse({})).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // loginSchema
  // ---------------------------------------------------------------------------
  describe("loginSchema", () => {
    const validLogin = {
      email: "test@example.com",
      password: "Password1",
      rememberMe: false,
    };

    it("accepts valid login data", () => {
      const result = loginSchema.parse(validLogin);
      expect(result.email).toBe("test@example.com");
    });

    it("lowercases email", () => {
      const result = loginSchema.parse({
        ...validLogin,
        email: "TEST@EXAMPLE.COM",
      });
      expect(result.email).toBe("test@example.com");
    });

    it("rejects invalid email", () => {
      expect(() =>
        loginSchema.parse({ ...validLogin, email: "bad" })
      ).toThrow();
    });

    it("rejects empty password", () => {
      expect(() =>
        loginSchema.parse({ ...validLogin, password: "" })
      ).toThrow();
    });

    it("requires rememberMe boolean", () => {
      expect(() =>
        loginSchema.parse({ email: "a@b.com", password: "x" })
      ).toThrow();
    });

    it("accepts rememberMe true", () => {
      const result = loginSchema.parse({ ...validLogin, rememberMe: true });
      expect(result.rememberMe).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // forgotPasswordSchema
  // ---------------------------------------------------------------------------
  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      const result = forgotPasswordSchema.parse({ email: "a@b.com" });
      expect(result.email).toBe("a@b.com");
    });

    it("rejects invalid email", () => {
      expect(() => forgotPasswordSchema.parse({ email: "nope" })).toThrow();
    });

    it("rejects empty email", () => {
      expect(() => forgotPasswordSchema.parse({ email: "" })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // resetPasswordSchema
  // ---------------------------------------------------------------------------
  describe("resetPasswordSchema", () => {
    const valid = {
      token: "some-token",
      password: "NewPass1a",
      confirmPassword: "NewPass1a",
    };

    it("accepts valid reset data", () => {
      const result = resetPasswordSchema.parse(valid);
      expect(result.token).toBe("some-token");
    });

    it("rejects empty token", () => {
      expect(() =>
        resetPasswordSchema.parse({ ...valid, token: "" })
      ).toThrow();
    });

    it("rejects weak password", () => {
      expect(() =>
        resetPasswordSchema.parse({
          ...valid,
          password: "weak",
          confirmPassword: "weak",
        })
      ).toThrow();
    });

    it("rejects mismatched passwords", () => {
      expect(() =>
        resetPasswordSchema.parse({ ...valid, confirmPassword: "Other1aa" })
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // changePasswordSchema
  // ---------------------------------------------------------------------------
  describe("changePasswordSchema", () => {
    const valid = {
      currentPassword: "OldPass1",
      newPassword: "NewPass1a",
      confirmNewPassword: "NewPass1a",
    };

    it("accepts valid change-password data", () => {
      const result = changePasswordSchema.parse(valid);
      expect(result.currentPassword).toBe("OldPass1");
    });

    it("rejects empty current password", () => {
      expect(() =>
        changePasswordSchema.parse({ ...valid, currentPassword: "" })
      ).toThrow();
    });

    it("rejects weak new password", () => {
      expect(() =>
        changePasswordSchema.parse({
          ...valid,
          newPassword: "short",
          confirmNewPassword: "short",
        })
      ).toThrow();
    });

    it("rejects mismatched new passwords", () => {
      expect(() =>
        changePasswordSchema.parse({
          ...valid,
          confirmNewPassword: "Mismatch1",
        })
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfileSchema
  // ---------------------------------------------------------------------------
  describe("updateProfileSchema", () => {
    it("accepts partial update (firstName only)", () => {
      const result = updateProfileSchema.parse({ firstName: "Jane" });
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBeUndefined();
    });

    it("accepts partial update (lastName only)", () => {
      const result = updateProfileSchema.parse({ lastName: "Smith" });
      expect(result.lastName).toBe("Smith");
    });

    it("accepts both fields", () => {
      const result = updateProfileSchema.parse({
        firstName: "Jane",
        lastName: "Smith",
      });
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
    });

    it("accepts empty object (all optional)", () => {
      const result = updateProfileSchema.parse({});
      expect(result.firstName).toBeUndefined();
    });

    it("rejects first name longer than 50 characters", () => {
      expect(() =>
        updateProfileSchema.parse({ firstName: "X".repeat(51) })
      ).toThrow();
    });

    it("rejects empty string firstName (min 1)", () => {
      expect(() => updateProfileSchema.parse({ firstName: "" })).toThrow();
    });
  });
});
