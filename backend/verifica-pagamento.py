import os
import json
import boto3
import logging
import stripe  # MUDANÇA: Importamos a biblioteca do Stripe

# --- Configuração Inicial ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
sfn = boto3.client('stepfunctions')

# --- MUDANÇA: Configurar o Stripe com sua chave secreta da variável de ambiente ---
# Garanta que a variável 'STRIPE_SECRET_KEY' está configurada na sua Lambda!
if 'STRIPE_SECRET_KEY' in os.environ:
    stripe.api_key = os.environ['STRIPE_SECRET_KEY']

S3_BUCKET = os.environ.get('S3_BUCKET')

def lambda_handler(event, _context):
    """
    Esta função é acionada por mensagens na fila SQS e processa o pagamento real usando o Stripe.
    Ela usa um token de pagamento seguro para criar uma cobrança e, com base na resposta do Stripe,
    retoma o fluxo do Step Functions com o status de 'pago' ou 'recusado'.
    """
    logger.info(f"Evento Recebido: {event}")

    for record in event.get('Records', []):
        task_token = None  # Inicializa o task_token para o tratamento de erros
        try:
            # 1. PEGAR OS DADOS DA MENSAGEM SQS E DO ARQUIVO S3
            body = json.loads(record['body'])
            pedido_id = body.get("pedidoId")
            
            # --- MUDANÇA: Pegamos o 'payment_token', não mais o 'numero' do cartão ---
            payment_token = body.get("payment_token")

            if not pedido_id or not payment_token:
                logger.warning(f"Mensagem inválida, faltando pedidoId ou payment_token: {body}")
                continue

            # Recupera os dados complementares e o taskToken do S3
            response = s3.get_object(Bucket=S3_BUCKET, Key=f"tokens/pedido-{pedido_id}.json")
            dados = json.loads(response['Body'].read())
            task_token = dados['taskToken']
            produtos = dados.get('produtos', [])
            total = dados.get('total', 0)

            # --- MUDANÇA: A validação antiga foi removida. Agora vem a lógica de pagamento real. ---
            status_final = ""
            motivo = ""

            try:
                # Gateways de pagamento geralmente trabalham com o valor em centavos
                total_em_centavos = int(float(total) * 100)
                
                # 2. TENTAR FAZER A COBRANÇA REAL USANDO O STRIPE
                logger.info(f"Iniciando cobrança no Stripe para o pedido {pedido_id}")
                intent = stripe.PaymentIntent.create(
                    amount=total_em_centavos,
                    currency='brl',
                    payment_method=payment_token,
                    confirm=True,
                    automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
                    description=f"Pedido e-commerce #{pedido_id}"
                )

                # 3. VERIFICAR A RESPOSTA DO STRIPE
                if intent.status == 'succeeded':
                    status_final = "pago"
                    motivo = f"Transação Stripe ID: {intent.id}"
                    logger.info(f"Pagamento para pedido {pedido_id} APROVADO.")
                else:
                    status_final = "recusado"
                    motivo = f"Pagamento falhou no Stripe com status: {intent.status}"
                    logger.warning(motivo)

            except stripe.error.CardError as e:
                # O cartão foi recusado pelo banco (sem fundos, dados incorretos, etc.)
                status_final = "recusado"
                motivo = e.error.message
                logger.error(f"Erro de cartão para pedido {pedido_id}: {motivo}")
            except Exception as e:
                status_final = "erro"
                motivo = f"Erro inesperado no gateway: {str(e)}"
                logger.error(motivo)

            # 4. CONSTRUIR O RESULTADO E RETOMAR O STEP FUNCTION
            output_payload = {
                "pedidoId": pedido_id,
                "status": status_final,
                "produtos": produtos,
                "total": total,
                "motivo": motivo
            }
            
            sfn.send_task_success(
                taskToken=task_token,
                output=json.dumps(output_payload)
            )

            # 5. LIMPAR O ARQUIVO DE TOKEN DO S3
            s3.delete_object(Bucket=S3_BUCKET, Key=f"tokens/pedido-{pedido_id}.json")

        except Exception as e:
            logger.error(f"Erro GERAL no processamento do pedido: {e}")
            # Se um erro acontecer e já tivermos o task_token, podemos notificar a falha
            if task_token:
                sfn.send_task_failure(
                    taskToken=task_token,
                    error="InternalError",
                    cause=str(e)
                )

    return {
        "statusCode": 200,
        "body": json.dumps("Processamento de mensagens da fila finalizado.")
    }