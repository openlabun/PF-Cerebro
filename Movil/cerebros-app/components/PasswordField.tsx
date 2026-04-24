import { type ComponentProps, useState } from 'react';
import { TextInput } from 'react-native-paper';

type PasswordFieldProps = Omit<ComponentProps<typeof TextInput>, 'right' | 'secureTextEntry'> & {
  hidePasswordAccessibilityLabel?: string;
  showPasswordAccessibilityLabel?: string;
};

export function PasswordField({
  autoCapitalize = 'none',
  autoCorrect = false,
  hidePasswordAccessibilityLabel = 'Ocultar contraseña',
  showPasswordAccessibilityLabel = 'Mostrar contraseña',
  ...props
}: PasswordFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <TextInput
      {...props}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      secureTextEntry={!isPasswordVisible}
      right={
        <TextInput.Icon
          icon={isPasswordVisible ? 'eye-off' : 'eye'}
          forceTextInputFocus={false}
          onPress={() => setIsPasswordVisible((current) => !current)}
          accessibilityLabel={
            isPasswordVisible
              ? hidePasswordAccessibilityLabel
              : showPasswordAccessibilityLabel
          }
        />
      }
    />
  );
}
