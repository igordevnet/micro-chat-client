import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function codeValidator(): ValidatorFn{
    return (control: AbstractControl): ValidationErrors | null => {
        const code = control.value;
        if (!code) return null;
        const codePattern = /^[A-Z0-9]{6}$/.test(code);
        return !codePattern ? { invalidCode: true } : null;
    };
}