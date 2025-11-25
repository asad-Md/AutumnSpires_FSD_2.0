"use client";
import WideBtn from "@/components/buttons/WideBtn";
import FormInput from "@/components/auth/FormInput";

export default function LoginForm({ loginEmail, setLoginEmail, handleLogin, isLoading }) {
  return (
    <div className='text-center flex flex-col justify-between h-full'>
      <div>
        <h2 className='text-2xl text-white font-semibold mb-2'>Welcome Back</h2>
        <p className='text-white mb-6 text-sm'>Login to enter the spires.</p>
      </div>
      <div>
        <form
          onSubmit={handleLogin}
          className='space-y-4'
        >
          {/* invisible spacer - uses same sizing classes as FormInput so height matches exactly */}
          <FormInput
            type='text'
            aria-hidden='true'
            tabIndex={-1}
            value={""}
            readOnly
            className='text-transparent opacity-0 pointer-events-none select-none'
          />
          <FormInput
            type='email'
            placeholder='Email'
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
          />

          <WideBtn
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Proceed"}
          </WideBtn>
        </form>
      </div>
    </div>
  );
}
