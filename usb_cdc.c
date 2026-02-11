/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2024 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  * 
  * STM32N655I0H3Q Configuration:
  * - HSE: 24 MHz crystal oscillator (typical for STM32N6 Discovery/Nucleo)
  * - System Clock: 400 MHz (PLL1: HSE/5 * 100 / 2 = 24/5*100/2 = 400 MHz)
  * - USB Clock: 48 MHz (PLL2Q: HSE/5 * 96 / 10 = 24/5*96/10 = 48 MHz)
  * - USB: OTG HS peripheral with integrated PHY (dedicated pins)
  * - Virtual COM Port: CDC class device
  *
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "usb_device.h"
#include "usbd_cdc_if.h"

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
void Error_Handler(void);

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{
   
    HAL_Init();

   
    SystemClock_Config();

   
    MX_GPIO_Init();
    MX_USB_DEVICE_Init();
    
   
    HAL_Delay(2000);
    
    uint32_t last_ms = HAL_GetTick();
    
    while (1)
    {
        uint32_t now = HAL_GetTick();
        if ((now - last_ms) >= 100)
        {
            last_ms = now;
            const char msg[] = "hello world\r\n";
            
            uint8_t retry_count = 0;
            while (CDC_Transmit_FS((uint8_t *)msg, sizeof(msg) - 1) == USBD_BUSY)
            {
                HAL_Delay(1);
                if (++retry_count > 10) break;  
            }
        }
    }
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
    RCC_OscInitTypeDef RCC_OscInitStruct = {0};
    RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

    /** Configure the main internal regulator output voltage
    */
    __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE0);

    /** Initializes the RCC Oscillators according to the specified parameters
    * in the RCC_OscInitTypeDef structure.
    */
    RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
    RCC_OscInitStruct.HSEState = RCC_HSE_ON;
    RCC_OscInitStruct.PLL1.PLLState = RCC_PLL_ON;
    RCC_OscInitStruct.PLL1.PLLSource = RCC_PLLSOURCE_HSE;
    RCC_OscInitStruct.PLL1.PLLM = 5;
    RCC_OscInitStruct.PLL1.PLLN = 100;
    RCC_OscInitStruct.PLL1.PLLP = 2;
    RCC_OscInitStruct.PLL1.PLLQ = 2;
    RCC_OscInitStruct.PLL1.PLLR = 2;
    RCC_OscInitStruct.PLL1.PLLS = 2;
    RCC_OscInitStruct.PLL1.PLLT = 2;
    RCC_OscInitStruct.PLL1.PLLFractional = 0;
    if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
    {
        Error_Handler();
    }

    /** Configure PLL2 for USB 48MHz clock
    */
    RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_NONE;
    RCC_OscInitStruct.PLL2.PLLState = RCC_PLL_ON;
    RCC_OscInitStruct.PLL2.PLLSource = RCC_PLLSOURCE_HSE;
    RCC_OscInitStruct.PLL2.PLLM = 5;
    RCC_OscInitStruct.PLL2.PLLN = 96;
    RCC_OscInitStruct.PLL2.PLLP = 2;
    RCC_OscInitStruct.PLL2.PLLQ = 10;
    RCC_OscInitStruct.PLL2.PLLR = 2;
    RCC_OscInitStruct.PLL2.PLLS = 2;
    RCC_OscInitStruct.PLL2.PLLT = 2;
    RCC_OscInitStruct.PLL2.PLLFractional = 0;
    if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
    {
        Error_Handler();
    }

    /** Initializes the CPU, AHB and APB buses clocks
    */
    RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                                |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2
                                |RCC_CLOCKTYPE_PCLK4|RCC_CLOCKTYPE_PCLK5;
    RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
    RCC_ClkInitStruct.SYSCLKDivider = RCC_SYSCLK_DIV1;
    RCC_ClkInitStruct.AHBCLKDivider = RCC_HCLK_DIV2;
    RCC_ClkInitStruct.APB1CLKDivider = RCC_APB1_DIV2;
    RCC_ClkInitStruct.APB2CLKDivider = RCC_APB2_DIV2;
    RCC_ClkInitStruct.APB4CLKDivider = RCC_APB4_DIV2;
    RCC_ClkInitStruct.APB5CLKDivider = RCC_APB5_DIV2;

    if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_5) != HAL_OK)
    {
        Error_Handler();
    }

    /** Configure USB Clock Source
    */
    RCC_PeriphCLKInitTypeDef PeriphClkInit = {0};
    PeriphClkInit.PeriphClockSelection = RCC_PERIPHCLK_USBOTGHS;
    PeriphClkInit.UsbOtgHsClockSelection = RCC_USBOTGHSCLKSOURCE_PLL2Q;
    if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInit) != HAL_OK)
    {
        Error_Handler();
    }
}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    /* GPIO Ports Clock Enable */
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_GPIOD_CLK_ENABLE();
    __HAL_RCC_GPIOH_CLK_ENABLE();

    /* Configure USB OTG HS pins */
    /* Note: STM32N6 uses dedicated USB OTG HS pins */
    /* USB OTG HS is configured automatically by USB middleware */
    
    /* USB OTG HS Clock Enable */
    __HAL_RCC_USB_OTG_HS_CLK_ENABLE();
    __HAL_RCC_USBPHYC_CLK_ENABLE();
}

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
    /* User can add his own implementation to report the HAL error return state */
    __disable_irq();
    while (1)
    {
    }
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
    /* User can add his own implementation to report the file name and line number,
       ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
}
#endif /* USE_FULL_ASSERT */
